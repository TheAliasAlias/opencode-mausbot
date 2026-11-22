# Security

## Supported versions

The latest `0.1.x` release is supported with security fixes.

## Reporting a vulnerability

Please use **GitHub's private vulnerability reporting** on this repository:
**Security → Report a vulnerability**. Do not open a public issue for a
security problem.

Include the affected version, a minimal reproduction, and the impact. I aim to
acknowledge reports within seven days.

OpenCode Desktop itself is not maintained here. Report vulnerabilities in the
desktop app or server to the OpenCode project.

## What this plugin does

MausBot is a desktop plugin made of two parts:

- `index.js` runs in the OpenCode server. For sessions whose metadata contains
  a MausBot profile, it appends the bot's persona and memory to the model
  context and registers a `mausbot_remember` tool.
- `gui-experimental.cjs` runs in the OpenCode Desktop window. It stores the bot
  roster in the plugin store, creates normal OpenCode sessions, and renders the
  Bots fold and panel.

The plugin does not modify `app.asar`, the OpenCode binary, or any installed
app file. It uses the documented plugin APIs and the OpenCode client.

## Security model

- **Bots are real agents.** They inherit the tools, shell, filesystem, browser
  and MCP servers available to an OpenCode session. The approval preset is the
  safety boundary, not a sandbox.
- **Ask first** (the default) asks before file edits, shell commands and access
  outside the session directory. **Trusted** allows edits and asks before
  commands. **Autonomous** removes prompts; use it only in folders you trust.
- **Memory and instructions are plain text.** Bot profiles live in session
  metadata, and memory is written to
  `${XDG_DATA_HOME:-~/.local/share}/opencode-mausbot/bots/<bot id>/memory.md`
  (or the configured `memoryDirectory`). They are sent to the model provider
  configured for that session. Do not put passwords, tokens or other secrets in
  a bot's instructions or memory.
- **The plugin makes no network requests of its own.** Model calls, web access
  and tool calls go through the OpenCode session and the providers and MCP
  servers you configured.
- **Hidden chat rows are cosmetic.** The plugin marks its current chat rows in
  the tab strip, Home list and search results with a DOM attribute so they
  appear under their bot. This does not change session permissions or hide data
  from the OpenCode server.
- **The install script edits `~/.config/opencode/opencode.json`.** Review
  `install.sh` before running it. It preserves the other fields in that file.

## Dependencies

The package has no bundled runtime dependencies. It uses `@opencode/plugin` and
`effect`, which are provided by the OpenCode Desktop host at runtime. There is
no build step and no `node_modules` in the distribution.
