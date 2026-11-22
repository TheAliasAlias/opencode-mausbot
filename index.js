// MausBot — server part.
//
// The window part owns the roster and creates ordinary OpenCode sessions for
// each bot. This part does two small things on the server:
//
//   1. It injects the bot's personality (and its long-term memory) into every
//      model request made by a bot session. The profile lives in the session's
//      own metadata, so no extra database or config file is involved.
//   2. It gives bot sessions a `mausbot_remember` tool for durable notes.
//
// Everything is registered through the documented plugin hooks, so desktop
// updates do not require patching the app.

import { Plugin } from "@opencode/plugin"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

const META_KEY = "mausbot"
const MEMORY_PROMPT_LIMIT = 12_000
const MEMORY_FILE_LIMIT = 128_000
const TOOL_NAME = "mausbot_remember"

// Writes are serialized per bot so two tool calls cannot interleave.
const writes = new Map()

function memoryRoot(ctx) {
  const configured = ctx.options?.memoryDirectory

  if (typeof configured === "string" && configured.trim()) {
    return path.resolve(configured.trim())
  }

  const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share")

  return path.join(dataHome, "opencode-mausbot")
}

function safeID(value) {
  return String(value ?? "bot")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80)
}

function memoryFile(ctx, botID) {
  return path.join(memoryRoot(ctx), "bots", safeID(botID), "memory.md")
}

async function readMemory(ctx, botID) {
  try {
    return await readFile(memoryFile(ctx, botID), "utf8")
  } catch {
    return ""
  }
}

function tail(text, limit) {
  if (text.length <= limit) return text

  return `…${text.slice(-limit)}`
}

async function appendMemory(ctx, botID, note) {
  const key = safeID(botID)
  const previous = writes.get(key) ?? Promise.resolve()
  const next = previous.then(async () => {
    const file = memoryFile(ctx, botID)
    const before = await readMemory(ctx, botID)
    const stamp = new Date().toISOString()
    let after = `${before}${before && !before.endsWith("\n") ? "\n" : ""}## ${stamp}\n\n${note}\n\n`

    if (after.length > MEMORY_FILE_LIMIT) {
      after = `<!-- older notes trimmed -->\n\n${after.slice(-MEMORY_FILE_LIMIT + 32)}`
    }

    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, after, "utf8")
  })

  writes.set(
    key,
    next.catch(() => {}).finally(() => {
      writes.delete(key)
    }),
  )

  return next
}

async function sessionProfile(ctx, sessionID) {
  if (!sessionID) return undefined

  try {
    const session = await ctx.session.get({ sessionID })
    const profile = session?.metadata?.[META_KEY]

    if (!profile || typeof profile !== "object") return undefined
    if (session.parentID) return undefined

    return profile
  } catch {
    return undefined
  }
}

function persona(profile, memory) {
  const name = String(profile.name ?? "Maus")
  const tagline = String(profile.tagline ?? "").trim()
  const directory = String(profile.directory ?? "").trim()
  const instructions = String(profile.instructions ?? "").trim().slice(0, 16_000)
  const saved = tail(String(memory ?? "").trim(), MEMORY_PROMPT_LIMIT)

  return [
    `You are ${name}, one of the user's bots in OpenCode Desktop (MausBot).`,
    tagline ? `Your tagline: ${tagline}` : "",
    "You are not a generic assistant. Stay in this character, speak in the first person, and keep replies conversational, like a contact in a messaging app.",
    "",
    "Standing instructions from your owner:",
    instructions || "Be a capable, thoughtful assistant. Be concise, ask when something is ambiguous, and finish what you start.",
    directory ? `\nYour workspace is ${directory}. Changes you make there are real changes to the user's files.` : "",
    "",
    "You are running as a normal OpenCode agent session. You can use the same tools, shell, files, browser and MCP servers as any OpenCode session. OpenCode may ask the user to approve commands and edits: wait for that approval, and never claim an action succeeded before it actually did. If the user denies something, adapt rather than repeating it.",
    "",
    "You have long-term memory. When you learn something durable about the user, a project, a preference, or an ongoing task, save one short note with the `mausbot_remember` tool. Do not save secrets, credentials, or transient details. Your saved notes appear below on every turn.",
    "",
    saved ? `Your memory so far:\n${saved}` : "You have no saved memory yet.",
  ]
    .filter((line) => line !== "")
    .join("\n")
}

export default Plugin.define({
  id: "mausbot",
  async setup(ctx) {
    const disposers = []

    const keep = async (label, register) => {
      try {
        const registration = await register()
        if (registration?.dispose) disposers.push(registration)
      } catch (error) {
        console.warn(`[mausbot] could not register ${label}; that feature is off`, error)
      }
    }

    await keep("personality hook", () =>
      ctx.session.hook("context", async (event) => {
        const profile = await sessionProfile(ctx, event.sessionID)

        if (!profile) {
          // The memory tool is global, but it only belongs in bot sessions.
          if (event.tools) delete event.tools[TOOL_NAME]
          return
        }

        const memory = await readMemory(ctx, profile.id)
        event.system.push({ type: "text", text: persona(profile, memory) })
      }),
    )

    await keep("bot titles", () =>
      ctx.session.hook("title", async (event) => {
        const profile = await sessionProfile(ctx, event.sessionID)

        if (profile?.name) event.result = String(profile.name)
      }),
    )

    await keep("memory tool", () =>
      ctx.tool.transform((editor) => {
        let namespaced = true

        try {
          editor.namespace({
            name: "mausbot",
            description: "MausBot long-term memory",
          })
        } catch {
          namespaced = false
        }

        editor.add({
          name: namespaced ? "remember" : TOOL_NAME,
          description:
            "Save a durable note to this bot's long-term memory. Use it when you learn something worth remembering across conversations: a user preference, a project fact, an ongoing task, or a correction. Keep each note short. Never save passwords, tokens, or other secrets.",
          input: {
            type: "object",
            properties: {
              note: {
                type: "string",
                description: "A short note to remember. One fact or preference per call.",
              },
            },
            required: ["note"],
            additionalProperties: false,
          },
          options: { codemode: false },
          execute: async (input, context) => {
            const note = String(input?.note ?? "").trim()

            if (!note) return { content: "Nothing to remember: the note was empty." }

            const profile = await sessionProfile(ctx, context.sessionID)

            if (!profile) return { content: "Memory is only available inside a MausBot session." }

            try {
              await appendMemory(ctx, profile.id, note.slice(0, 4_000))
              return { content: "Saved to long-term memory." }
            } catch (error) {
              return { content: `Could not save that note: ${error?.message ?? "unknown error"}` }
            }
          },
        })
      }),
    )

    return async () => {
      for (const registration of disposers) {
        try {
          await registration.dispose()
        } catch {
          // The plugin is already going away.
        }
      }
    }
  },
})
