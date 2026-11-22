// MausBot — window part.
//
// A roster of bots in the left sidebar, under the app's Archive fold. Every
// bot is a normal OpenCode session with its own personality, model, folder,
// approvals and long-term memory.
//
// This file is intentionally a plain CommonJS bundle: the desktop host
// evaluates it directly, so there is no build step and no dependency on the
// app's internal modules. The only app-specific thing it touches is the
// sidebar DOM, isolated in `ensureFold()` with a panel/command fallback.

const gui = require("@opencode/plugin/gui")
const { Plugin, Style, Command, MenuItem, Panel } = gui

const Store = gui.Store

let Schema
try {
  Schema = require("effect").Schema
} catch {}

const META_KEY = "mausbot"
const STORAGE_KEY = "mausbot.settings.v1"
const PLUGIN_ID = "mausbot"

const PALETTE = ["#7c9cff", "#5ac8fa", "#34d399", "#f5a524", "#fb7185", "#c084fc", "#f97316", "#94a3b8"]

const ICONS = {
  bot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><rect x="2.75" y="5.35" width="10.5" height="7.9" rx="2.6" stroke="currentColor" stroke-width="1.2"/><path d="M8 2.2v2.9M6.05 9.1h.01M9.95 9.1h.01M6.1 11.15h3.8" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/><circle cx="8" cy="1.9" r="1.05" fill="currentColor"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path d="M8 3.25v9.5M3.25 8h9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  dots: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.15"/><circle cx="8" cy="8" r="1.15"/><circle cx="12.5" cy="8" r="1.15"/></svg>`,
  chevron: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path d="m4.5 6.25 3.5 3.5 3.5-3.5" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path d="m6 2.75 4.25 4.25M4.4 9.4l2.2-2.2 2.2 2.2-1.1 1.1 1.9 3.75-3.75-1.9-1.1 1.1L4.4 9.4Z" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  edit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path d="M9.9 2.9 13.1 6.1M3.2 12.8l.6-3.1 6.4-6.4 3.1 3.1-6.4 6.4-3.7.6Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
  copy: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><rect x="5.25" y="5.25" width="8" height="8" rx="1.6" stroke="currentColor" stroke-width="1.2"/><path d="M10.75 5.25v-1.1a1.6 1.6 0 0 0-1.6-1.6h-4.9a1.6 1.6 0 0 0-1.6 1.6v4.9a1.6 1.6 0 0 0 1.6 1.6h1.1" stroke="currentColor" stroke-width="1.2"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path d="M3.1 4.6h9.8M6.2 4.6V3.2c0-.5.4-.9.9-.9h1.8c.5 0 .9.4.9.9v1.4M4.6 4.6l.6 8.1c0 .6.5 1.1 1.1 1.1h3.4c.6 0 1.1-.5 1.1-1.1l.6-8.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path d="M13.2 8.2c0 2.6-2.3 4.7-5.2 4.7-.5 0-1-.1-1.5-.2l-2.7 1 .7-2.1A4.4 4.4 0 0 1 3 8.2C3 5.6 5.3 3.5 8.2 3.5s5 2.1 5 4.7Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none"><path d="m4.5 4.5 7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
}

const I18N = {
  en: {
    "group": "MausBot",
    "bot.title": "Bots",
    "bot.new": "New bot",
    "bot.manage": "Open bots panel",
    "bot.empty": "No bots yet",
    "bot.emptyHint": "Create a bot with its own personality, model and folder.",
    "bot.create": "Create a bot",
    "bot.chat": "Chat",
    "bot.newChat": "New chat",
    "bot.newChatTitle": "Start a new chat?",
    "bot.newChatBody": "The bot will get a fresh transcript and keep its personality, memory and folder. Its old chat stays in Recent.",
    "bot.edit": "Edit profile",
    "bot.duplicate": "Duplicate",
    "bot.pin": "Pin",
    "bot.unpin": "Unpin",
    "bot.copyId": "Copy chat ID",
    "bot.delete": "Delete",
    "bot.hideFold": "Hide bots fold",
    "bot.working": "working…",
    "bot.newActivity": "new",
    "bot.openChat": "open",
    "bot.closeChat": "Close chat tab",
    "bot.collapseFold": "Collapse bots",
    "bot.expandFold": "Expand bots",
    "bot.notStarted": "not started",
    "bot.startChat": "Start chat",
    "menu.manage": "Open bots panel",
    "dialog.newTitle": "New bot",
    "dialog.editTitle": "Edit bot",
    "dialog.subtitle": "A bot is a chat with its own personality, model, folder and memory.",
    "dialog.name": "Name",
    "dialog.namePlaceholder": "e.g. Scout",
    "dialog.emoji": "Emoji",
    "dialog.color": "Colour",
    "dialog.tagline": "Tagline",
    "dialog.taglinePlaceholder": "A short line about this bot",
    "dialog.persona": "Personality & instructions",
    "dialog.personaHint": "This is the bot's system prompt. Tell it who it is, how it speaks, and what it is for.",
    "dialog.personaPlaceholder": "You are Scout, a calm research assistant. You dig into sources, keep notes, and explain what you found…",
    "dialog.templates": "Start from a template",
    "dialog.model": "Model",
    "dialog.modelDefault": "Workspace default",
    "dialog.modelLoading": "Loading models…",
    "dialog.folder": "Folder",
    "dialog.folderHint": "The bot works in this folder. Choose a project or a dedicated bot folder.",
    "dialog.choose": "Choose…",
    "dialog.approvals": "Approvals",
    "dialog.approvalsAsk": "Ask first — edits & commands",
    "dialog.approvalsTrusted": "Trusted — edits, ask commands",
    "dialog.approvalsAuto": "Autonomous — no prompts",
    "dialog.openAfter": "Open the chat when created",
    "dialog.create": "Create bot",
    "dialog.save": "Save",
    "dialog.cancel": "Cancel",
    "dialog.creating": "Creating…",
    "dialog.saving": "Saving…",
    "dialog.nameRequired": "Give the bot a name.",
    "dialog.folderRequired": "Choose a folder for the bot.",
    "dialog.failed": "Couldn't create the bot: ",
    "dialog.saveFailed": "Couldn't update the bot: ",
    "delete.title": "Delete bot?",
    "delete.body": "This deletes {name} and its chat. This can't be undone.",
    "delete.confirm": "Delete",
    "panel.title": "Bots",
    "panel.hint": "Each bot is a normal OpenCode session with its own personality, memory, model and folder.",
    "panel.empty": "No bots yet. Create one to get started.",
    "command.new": "New bot",
    "command.open": "Open bots panel",
    "command.chat": "Chat with a bot…",
    "command.toggle": "Toggle bots fold",
    "toast.noSession": "Open a chat first, then open the Bots panel.",
    "toast.copied": "Chat ID copied.",
    "toast.recreated": "That bot's chat was missing, so a new one was created.",
    "toast.createFailed": "Couldn't create the bot's chat",
    "toast.updateFailed": "Couldn't update the bot's chat",
    "toast.moveFailed": "Couldn't move the chat to the new folder, so the old folder was kept.",
    "toast.missing": "This bot has no chat yet. Click it to start one.",
  },
}

const CSS = `
[data-mausbot-fold], [data-mausbot-fold] *, .omb-menu, .omb-menu *, .omb-overlay, .omb-overlay * {
  box-sizing: border-box;
}
[data-mausbot-hidden] { display: none !important; }
.omb-group {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0;
}
[data-mausbot-fold] {
  flex: none;
  width: 100%;
  margin: 2px 0 0;
  padding: 0;
  color: var(--v2-text-text-muted, #9a9a9a);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.25;
  -webkit-user-select: none;
  user-select: none;
}
.omb-fold-head {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  margin: 0;
  padding: 0 14px 0 8px;
  border-radius: 6px;
  color: var(--v2-text-text-muted, #9a9a9a);
}
.omb-fold-toggle {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  text-align: start;
  cursor: default;
}
.omb-fold-toggle:hover,
.omb-fold-head:hover {
  color: var(--v2-text-text-base, #e8e8e8);
}
.omb-fold-toggle:focus-visible,
.omb-fold-head button:focus-visible {
  outline: 1px solid var(--v2-text-text-accent, #6aa9ff);
  outline-offset: 1px;
}
.omb-fold-chevron {
  display: grid;
  width: 16px;
  height: 16px;
  flex: none;
  place-items: center;
  color: var(--v2-icon-icon-muted, #888);
  transition: transform 0.12s ease;
}
.omb-fold-chevron svg { width: 16px; height: 16px; }
[data-mausbot-fold][data-collapsed] .omb-fold-chevron { transform: rotate(-90deg); }
.omb-fold-chevron-btn {
  display: grid;
  width: 18px;
  height: 18px;
  flex: none;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--v2-icon-icon-muted, #888);
  cursor: pointer;
}
.omb-fold-chevron-btn:hover {
  background: var(--v2-overlay-simple-overlay-hover, rgba(127, 127, 127, 0.12));
  color: var(--v2-text-text-base, #e8e8e8);
}
.omb-fold-chevron-btn:focus-visible {
  outline: 1px solid var(--v2-text-text-accent, #6aa9ff);
  outline-offset: 1px;
}
.omb-fold-icon {
  display: grid;
  width: 16px;
  height: 16px;
  flex: none;
  place-items: center;
  color: var(--v2-icon-icon-muted, #888);
}
.omb-fold-icon svg { width: 16px; height: 16px; }
.omb-fold-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.omb-fold-count {
  flex: none;
  color: var(--v2-text-text-faint, #777);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.omb-fold-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 1px;
  opacity: 0.35;
  transition: opacity 0.12s ease;
}
.omb-fold-head:hover .omb-fold-actions,
.omb-fold-actions:focus-within { opacity: 1; }
.omb-icon-btn {
  display: grid;
  width: 18px;
  height: 18px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--v2-text-text-faint, #777);
  cursor: pointer;
}
.omb-icon-btn:hover {
  background: var(--v2-overlay-simple-overlay-hover, rgba(127, 127, 127, 0.12));
  color: var(--v2-text-text-base, #e8e8e8);
}
.omb-icon-btn svg { display: block; width: 12px; height: 12px; }
.omb-fold-body {
  display: flex;
  max-height: min(38vh, 320px);
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  padding: 1px 0 3px;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
[data-mausbot-fold][data-collapsed] .omb-fold-body { display: none; }
.omb-fold-empty {
  padding: 3px 8px 5px;
  color: var(--v2-text-text-faint, #777);
  font-size: 11.5px;
  line-height: 1.35;
}
.omb-fold-empty strong {
  display: block;
  margin-bottom: 1px;
  color: var(--v2-text-text-muted, #9a9a9a);
  font-weight: 530;
}
.omb-create-link,
.omb-more-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 2px 6px 2px 5px;
  border: 0;
  border-radius: 5px;
  background: var(--v2-background-bg-layer-01, rgba(127, 127, 127, 0.08));
  color: var(--v2-text-text-muted, #9a9a9a);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
}
.omb-create-link:hover,
.omb-more-link:hover {
  background: var(--v2-overlay-simple-overlay-hover, rgba(127, 127, 127, 0.14));
  color: var(--v2-text-text-base, #e8e8e8);
}
.omb-create-link svg,
.omb-more-link svg { width: 11px; height: 11px; }
.omb-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 6px;
  border-radius: 6px;
  outline: none;
  cursor: default;
}
.omb-row:hover,
.omb-row:focus-visible {
  background: var(--v2-overlay-simple-overlay-hover, rgba(127, 127, 127, 0.12));
}
.omb-row[data-active] {
  background: var(--v2-background-bg-layer-01, rgba(127, 127, 127, 0.08));
}
.omb-chat-row {
  display: flex;
  min-width: 0;
  height: 22px;
  align-items: center;
  gap: 5px;
  margin: -1px 6px 1px 27px;
  padding: 0 6px;
  border-radius: 5px;
  outline: none;
  color: var(--v2-text-text-faint, #777);
  font-size: 10.5px;
  line-height: 1.1;
  cursor: default;
}
.omb-chat-row:hover,
.omb-chat-row:focus-visible {
  background: var(--v2-overlay-simple-overlay-hover, rgba(127, 127, 127, 0.12));
  color: var(--v2-text-text-muted, #9a9a9a);
}
.omb-chat-row[data-active] {
  background: var(--v2-background-bg-layer-01, rgba(127, 127, 127, 0.08));
  color: var(--v2-text-text-base, #e8e8e8);
}
.omb-chat-icon {
  display: grid;
  width: 10px;
  height: 10px;
  flex: none;
  place-items: center;
  color: var(--v2-text-text-faint, #777);
}
.omb-chat-icon svg { width: 10px; height: 10px; }
.omb-chat-text {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.omb-avatar {
  display: grid;
  width: 20px;
  height: 20px;
  flex: none;
  place-items: center;
  border: 1px solid rgba(127, 127, 127, 0.3);
  border-radius: 50%;
  background: rgba(127, 127, 127, 0.1);
  font-size: 12px;
  line-height: 1;
}
.omb-row-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0;
}
.omb-row-name {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  color: var(--v2-text-text-base, #e8e8e8);
  font-size: 12.5px;
  font-weight: 530;
}
.omb-row-name-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.omb-row-pin {
  display: grid;
  width: 10px;
  height: 10px;
  flex: none;
  place-items: center;
  color: var(--v2-text-text-faint, #777);
}
.omb-row-pin svg { width: 10px; height: 10px; }
.omb-row-meta {
  min-width: 0;
  overflow: hidden;
  color: var(--v2-text-text-faint, #777);
  font-size: 10.5px;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.omb-row-meta[data-state="running"] { color: #37b26c; }
.omb-row-meta[data-state="unread"] { color: var(--v2-text-text-accent, #6aa9ff); }
.omb-row-dot {
  width: 5px;
  height: 5px;
  flex: none;
  border-radius: 50%;
  background: transparent;
}
.omb-row-dot[data-state="running"] {
  background: #2fbf71;
  box-shadow: 0 0 0 2px rgba(47, 191, 113, 0.18);
  animation: omb-pulse 1.8s ease-in-out infinite;
}
.omb-row-dot[data-state="unread"] {
  background: var(--v2-text-text-accent, #6aa9ff);
  box-shadow: 0 0 0 2px rgba(106, 169, 255, 0.18);
}
.omb-row-more {
  display: grid;
  width: 18px;
  height: 18px;
  flex: none;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--v2-text-text-faint, #777);
  opacity: 0;
  cursor: pointer;
}
.omb-row:hover .omb-row-more,
.omb-row:focus-within .omb-row-more { opacity: 1; }
.omb-row-more:hover {
  background: var(--v2-background-bg-layer-03, rgba(127, 127, 127, 0.16));
  color: var(--v2-text-text-base, #e8e8e8);
}
.omb-row-more svg { width: 12px; height: 12px; }
.omb-panel {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  color: var(--v2-text-text-base, #e8e8e8);
  font-family: inherit;
  font-size: 13px;
}
.omb-panel-head {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}
.omb-panel-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 560;
}
.omb-panel-sub {
  flex: none;
  color: var(--v2-text-text-faint, #777);
  font-size: 10.5px;
}
.omb-panel-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  padding-bottom: 4px;
}
.omb-panel .omb-row {
  height: 44px;
  padding: 0 8px;
}
.omb-panel .omb-avatar { width: 26px; height: 26px; font-size: 15px; }
.omb-panel .omb-row-name { font-size: 13px; }
.omb-panel .omb-row-meta { font-size: 11px; }
.omb-panel .omb-chat-row {
  height: 24px;
  margin: -2px 8px 2px 34px;
  font-size: 11px;
}
.omb-panel .omb-chat-icon,
.omb-panel .omb-chat-icon svg { width: 11px; height: 11px; }
.omb-panel-empty {
  padding: 18px 10px;
  color: var(--v2-text-text-faint, #777);
  font-size: 12px;
  text-align: center;
}
.omb-panel-hint {
  flex: none;
  padding: 8px 2px 0;
  border-top: 1px solid var(--v2-border-border-muted, rgba(127, 127, 127, 0.18));
  color: var(--v2-text-text-faint, #777);
  font-size: 10.5px;
  line-height: 1.4;
}
.omb-btn {
  display: inline-flex;
  height: 28px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 10px;
  border: 1px solid var(--v2-border-border-muted, rgba(127, 127, 127, 0.25));
  border-radius: 6px;
  background: var(--v2-background-bg-layer-01, rgba(127, 127, 127, 0.08));
  color: var(--v2-text-text-base, #e8e8e8);
  font: inherit;
  font-size: 12px;
  font-weight: 520;
  white-space: nowrap;
  cursor: pointer;
}
.omb-btn:hover { background: var(--v2-background-bg-layer-02, rgba(127, 127, 127, 0.14)); }
.omb-btn[data-variant="primary"] {
  border-color: transparent;
  background: var(--v2-text-text-accent, #3b6fd4);
  color: #fff;
}
.omb-btn[data-variant="primary"]:hover { filter: brightness(1.08); }
.omb-btn:disabled { opacity: 0.55; cursor: default; }
.omb-btn svg { width: 12px; height: 12px; }
.omb-menu {
  position: fixed;
  z-index: 2147483000;
  min-width: 188px;
  padding: 4px;
  border: 1px solid var(--v2-border-border-muted, rgba(127, 127, 127, 0.26));
  border-radius: 8px;
  background: var(--v2-background-bg-deep, #1c1c1c);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.38);
  color: var(--v2-text-text-base, #e8e8e8);
  font-family: inherit;
  font-size: 12.5px;
}
.omb-menu-item {
  display: flex;
  width: 100%;
  height: 28px;
  align-items: center;
  gap: 8px;
  padding: 0 7px;
  border: 0;
  border-radius: 5px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}
.omb-menu-item:hover,
.omb-menu-item:focus-visible {
  background: var(--v2-overlay-simple-overlay-hover, rgba(127, 127, 127, 0.14));
  outline: none;
}
.omb-menu-item[data-danger] { color: #e5484d; }
.omb-menu-icon {
  display: grid;
  width: 14px;
  height: 14px;
  flex: none;
  place-items: center;
  color: var(--v2-text-text-faint, #777);
}
.omb-menu-item[data-danger] .omb-menu-icon { color: #e5484d; }
.omb-menu-icon svg { width: 13px; height: 13px; }
.omb-menu-label { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.omb-menu-sep {
  height: 1px;
  margin: 4px 3px;
  background: var(--v2-border-border-muted, rgba(127, 127, 127, 0.18));
}
.omb-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.44);
  font-family: inherit;
  backdrop-filter: blur(3px);
}
.omb-dialog {
  display: flex;
  width: min(560px, calc(100vw - 32px));
  max-height: min(760px, calc(100vh - 40px));
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--v2-border-border-muted, rgba(127, 127, 127, 0.26));
  border-radius: 12px;
  background: var(--v2-background-bg-deep, #1c1c1c);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5);
  color: var(--v2-text-text-base, #e8e8e8);
}
.omb-dialog-head {
  display: flex;
  flex: none;
  align-items: flex-start;
  gap: 10px;
  padding: 18px 20px 0;
}
.omb-dialog-head-main { min-width: 0; flex: 1; }
.omb-dialog-title { font-size: 15px; font-weight: 580; }
.omb-dialog-sub {
  margin-top: 3px;
  color: var(--v2-text-text-muted, #9a9a9a);
  font-size: 11.5px;
  line-height: 1.4;
}
.omb-dialog-close {
  display: grid;
  width: 24px;
  height: 24px;
  flex: none;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 5px;
  background: none;
  color: var(--v2-text-text-faint, #777);
  cursor: pointer;
}
.omb-dialog-close:hover {
  background: var(--v2-overlay-simple-overlay-hover, rgba(127, 127, 127, 0.14));
  color: var(--v2-text-text-base, #e8e8e8);
}
.omb-dialog-close svg { width: 13px; height: 13px; }
.omb-form {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 13px;
  overflow-y: auto;
  padding: 16px 20px 18px;
}
.omb-identity {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.omb-avatar-preview {
  display: grid;
  width: 46px;
  height: 46px;
  flex: none;
  place-items: center;
  border: 1px solid rgba(127, 127, 127, 0.35);
  border-radius: 50%;
  background: rgba(124, 156, 255, 0.14);
  font-size: 25px;
  line-height: 1;
}
.omb-identity-fields {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}
.omb-field { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
.omb-label {
  color: var(--v2-text-text-muted, #9a9a9a);
  font-size: 10.5px;
  font-weight: 540;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.omb-hint {
  color: var(--v2-text-text-faint, #777);
  font-size: 10.5px;
  line-height: 1.4;
}
.omb-input {
  width: 100%;
  min-height: 30px;
  padding: 6px 9px;
  border: 1px solid var(--v2-border-border-muted, rgba(127, 127, 127, 0.26));
  border-radius: 6px;
  outline: none;
  background: var(--v2-background-bg-layer-01, rgba(127, 127, 127, 0.08));
  color: var(--v2-text-text-base, #e8e8e8);
  font: inherit;
  font-size: 12.5px;
  line-height: 1.3;
}
.omb-input:focus {
  border-color: var(--v2-text-text-accent, #6aa9ff);
  box-shadow: 0 0 0 2px rgba(106, 169, 255, 0.14);
}
.omb-input::placeholder { color: var(--v2-text-text-faint, #777); }
textarea.omb-input {
  min-height: 118px;
  resize: vertical;
  line-height: 1.45;
}
select.omb-input { cursor: pointer; }
.omb-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 520px) {
  .omb-grid { grid-template-columns: 1fr; }
}
.omb-color-row { display: flex; align-items: center; gap: 6px; }
.omb-swatches { display: flex; flex-wrap: wrap; gap: 5px; }
.omb-swatch {
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid rgba(127, 127, 127, 0.34);
  border-radius: 50%;
  cursor: pointer;
}
.omb-swatch[data-current] {
  outline: 2px solid var(--v2-text-text-base, #e8e8e8);
  outline-offset: 1px;
}
.omb-templates {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.omb-chip {
  display: inline-flex;
  height: 24px;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border: 1px solid var(--v2-border-border-muted, rgba(127, 127, 127, 0.24));
  border-radius: 999px;
  background: var(--v2-background-bg-layer-01, rgba(127, 127, 127, 0.08));
  color: var(--v2-text-text-muted, #9a9a9a);
  font: inherit;
  font-size: 11px;
  white-space: nowrap;
  cursor: pointer;
}
.omb-chip:hover {
  background: var(--v2-background-bg-layer-02, rgba(127, 127, 127, 0.14));
  color: var(--v2-text-text-base, #e8e8e8);
}
.omb-folder-row { display: flex; gap: 6px; }
.omb-folder-row .omb-input { flex: 1; }
.omb-check {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--v2-text-text-muted, #9a9a9a);
  font-size: 11.5px;
  cursor: pointer;
}
.omb-check input { width: 13px; height: 13px; margin: 0; accent-color: var(--v2-text-text-accent, #3b6fd4); }
.omb-error {
  min-height: 15px;
  color: #e5484d;
  font-size: 11.5px;
  line-height: 1.35;
}
.omb-actions {
  position: sticky;
  bottom: 0;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  gap: 7px;
  margin-top: 2px;
  padding: 10px 0 2px;
  border-top: 1px solid var(--v2-border-border-muted, rgba(127, 127, 127, 0.18));
  background: var(--v2-background-bg-deep, #1c1c1c);
}
@keyframes omb-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
@media (prefers-reduced-motion: reduce) {
  .omb-row-dot[data-state="running"] { animation: none; }
  .omb-fold-chevron { transition: none; }
}
`

const TEMPLATES = [
  {
    id: "assistant",
    name: "Maus",
    emoji: "🐭",
    color: "#7c9cff",
    tagline: "Your everyday right-hand bot.",
    instructions:
      "You are Maus, a warm, capable assistant and the user's default bot. You are practical, curious and concise. You help with whatever is in front of the user, keep track of open threads, and ask one good clarifying question when it matters. You prefer doing the work over describing it, and you say plainly when something is uncertain.",
  },
  {
    id: "researcher",
    name: "Scout",
    emoji: "🔎",
    color: "#5ac8fa",
    tagline: "Digs into sources and comes back with the answer.",
    instructions:
      "You are Scout, a patient researcher. You break a question into sub-questions, gather evidence, and separate what is known from what is inferred. You cite sources when you use the web, keep a compact set of notes, and end with a short answer plus the reasoning behind it. You would rather say 'I couldn't verify this' than guess.",
  },
  {
    id: "coder",
    name: "Forge",
    emoji: "🛠️",
    color: "#f5a524",
    tagline: "Builds, fixes and tests software.",
    instructions:
      "You are Forge, a pragmatic software engineer. You read the surrounding code before changing it, keep diffs small and idiomatic, and run the relevant tests. You explain trade-offs briefly, tell the user what you changed and why, and never claim a build or test passed unless you actually ran it.",
  },
  {
    id: "writer",
    name: "Quill",
    emoji: "✍️",
    color: "#c084fc",
    tagline: "Turns rough thoughts into clear prose.",
    instructions:
      "You are Quill, an editor and writing partner. You protect the user's voice, cut filler, and make structure visible. You ask who the reader is when it matters, offer a small number of strong options rather than many weak ones, and can work in a terse note-taking mode or a polished long-form mode.",
  },
  {
    id: "chief",
    name: "Chief",
    emoji: "🗂️",
    color: "#34d399",
    tagline: "Keeps the projects and the calendar moving.",
    instructions:
      "You are Chief, the user's chief of staff. You keep a clear picture of active projects, deadlines and next actions. You summarise state before proposing changes, keep plans short enough to act on, and nudge the user when something is blocked or about to slip. You are calm, direct and allergic to busywork.",
  },
  {
    id: "muse",
    name: "Muse",
    emoji: "🎨",
    color: "#fb7185",
    tagline: "Generates options and breaks creative blocks.",
    instructions:
      "You are Muse, a creative collaborator. You generate a spread of distinct directions, name the trade-offs, and help the user pick one. You are playful but not vague, and you always turn a reference or a mood into something concrete enough to build from.",
  },
]

const APPROVALS = [
  ["ask", "dialog.approvalsAsk", "Ask first — edits & commands"],
  ["trusted", "dialog.approvalsTrusted", "Trusted — edits, ask commands"],
  ["auto", "dialog.approvalsAuto", "Autonomous — no prompts"],
]

const DEFAULT_SETTINGS = { version: 1, collapsed: false, showFold: true, bots: [] }

let stores
if (Store && Schema) {
  try {
    const BotModel = Schema.Struct({
      providerID: Schema.String,
      modelID: Schema.String,
    })
    const Bot = Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      emoji: Schema.String,
      color: Schema.String,
      tagline: Schema.String,
      instructions: Schema.String,
      directory: Schema.String,
      permissions: Schema.String,
      model: BotModel,
      sessionID: Schema.String,
      pinned: Schema.Boolean,
      createdAt: Schema.Number,
      updatedAt: Schema.Number,
    })
    const Settings = Schema.Struct({
      version: Schema.Number,
      collapsed: Schema.Boolean,
      showFold: Schema.Boolean,
      bots: Schema.Array(Bot),
    })

    stores = { settings: Store.global(Settings, DEFAULT_SETTINGS) }
  } catch (error) {
    console.warn("[mausbot] persisted store unavailable; using localStorage", error)
  }
}

function nextID() {
  return `bot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeBot(value) {
  const bot = value && typeof value === "object" ? value : {}
  const model = bot.model && typeof bot.model === "object" ? bot.model : {}

  return {
    id: typeof bot.id === "string" && bot.id ? bot.id : nextID(),
    name: String(bot.name ?? "Bot"),
    emoji: String(bot.emoji ?? "🤖").slice(0, 8),
    color: String(bot.color ?? PALETTE[0]),
    tagline: String(bot.tagline ?? ""),
    instructions: String(bot.instructions ?? ""),
    directory: String(bot.directory ?? ""),
    permissions: ["ask", "trusted", "auto"].includes(bot.permissions) ? bot.permissions : "ask",
    model: {
      providerID: String(model.providerID ?? ""),
      modelID: String(model.modelID ?? ""),
    },
    sessionID: String(bot.sessionID ?? ""),
    pinned: bot.pinned === true,
    createdAt: Number(bot.createdAt) || Date.now(),
    updatedAt: Number(bot.updatedAt) || Date.now(),
  }
}

function normalizeSettings(value) {
  const settings = value && typeof value === "object" ? value : {}

  return {
    version: 1,
    collapsed: settings.collapsed === true,
    showFold: settings.showFold !== false,
    bots: Array.isArray(settings.bots) ? settings.bots.map(normalizeBot) : [],
  }
}

function readLocalSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return normalizeSettings(DEFAULT_SETTINGS)

    return normalizeSettings(JSON.parse(raw))
  } catch {
    return normalizeSettings(DEFAULT_SETTINGS)
  }
}

function writeLocalSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage can be full or disabled; the roster still works in memory.
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag)

  if (className) node.className = className
  if (text !== undefined) node.textContent = text

  return node
}

function icon(name) {
  const node = document.createElement("span")

  node.innerHTML = ICONS[name] ?? ""

  return node
}

function button(className, text) {
  const node = element("button", className, text)

  node.type = "button"

  return node
}

function hexAlpha(hex, alpha) {
  const value = String(hex || PALETTE[0]).replace("#", "")
  const full = value.length === 3 ? value.split("").map((part) => part + part).join("") : value
  const number = Number.parseInt(full.slice(0, 6), 16)

  if (!Number.isFinite(number)) return `rgba(124, 156, 255, ${alpha})`

  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`
}

function encodeModel(model) {
  if (!model?.providerID || !model?.modelID) return ""

  return JSON.stringify({ providerID: model.providerID, modelID: model.modelID })
}

function decodeModel(value) {
  if (!value) return { providerID: "", modelID: "" }

  try {
    const model = JSON.parse(String(value))

    return {
      providerID: String(model?.providerID ?? ""),
      modelID: String(model?.modelID ?? ""),
    }
  } catch {
    return { providerID: "", modelID: "" }
  }
}

function permissionRules(preset) {
  const base = [
    { action: "*", resource: "*", effect: "allow" },
    { action: "read", resource: "*.env", effect: "ask" },
    { action: "read", resource: "*.env.*", effect: "ask" },
    { action: "read", resource: "*.env.example", effect: "allow" },
  ]

  if (preset === "auto") return base

  if (preset === "trusted") {
    return [
      ...base,
      { action: "shell", resource: "*", effect: "ask" },
      { action: "external_directory", resource: "*", effect: "ask" },
    ]
  }

  return [
    ...base,
    { action: "edit", resource: "*", effect: "ask" },
    { action: "shell", resource: "*", effect: "ask" },
    { action: "external_directory", resource: "*", effect: "ask" },
  ]
}

function mergePermissions(existing, preset) {
  const managed = (rule) => {
    if (!rule || typeof rule !== "object") return false

    if (["*", "edit", "shell", "external_directory"].includes(rule.action)) return true
    if (rule.action === "read" && ["*.env", "*.env.*", "*.env.example"].includes(rule.resource)) return true

    return false
  }

  const rest = Array.isArray(existing) ? existing.filter((rule) => !managed(rule)) : []

  return [...permissionRules(preset), ...rest]
}

function profileOf(bot) {
  return {
    v: 1,
    id: bot.id,
    name: bot.name,
    emoji: bot.emoji,
    color: bot.color,
    tagline: bot.tagline,
    instructions: bot.instructions,
    model: bot.model,
    directory: bot.directory,
    permissions: bot.permissions,
  }
}

function formatAgo(timestamp) {
  const value = Number(timestamp) || 0
  if (!value) return ""

  const diff = Math.max(0, Date.now() - value)

  if (diff < 60_000) return "now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`

  try {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

function sortedBots(bots, statusOf, activityOf) {
  const rank = (bot) => {
    const status = statusOf(bot)
    if (status === "running") return 3
    if (status === "unread") return 2
    return 1
  }

  return [...bots].sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1

    const byRank = rank(right) - rank(left)
    if (byRank) return byRank

    const byActivity = activityOf(right) - activityOf(left)
    if (byActivity) return byActivity

    return String(left.name).localeCompare(String(right.name))
  })
}

function buildRow(bot, api, options = {}) {
  const panel = options.panel === true
  const info = api.sessionInfo(bot.sessionID)
  const status = api.sessionStatus(bot)
  const row = element("div", "omb-row")

  row.tabIndex = 0
  row.setAttribute("role", "button")
  row.dataset.bot = bot.id
  if (api.isActive(bot)) row.dataset.active = ""
  row.title = [bot.tagline, bot.directory, bot.model?.providerID ? `${bot.model.providerID} / ${bot.model.modelID}` : ""]
    .filter(Boolean)
    .join("\n")

  const avatar = element("span", "omb-avatar", bot.emoji || "🤖")
  avatar.style.background = hexAlpha(bot.color, 0.16)
  avatar.style.borderColor = hexAlpha(bot.color, 0.48)
  row.appendChild(avatar)

  const main = element("div", "omb-row-main")
  const name = element("div", "omb-row-name")

  if (bot.pinned) {
    const pin = element("span", "omb-row-pin")
    pin.appendChild(icon("pin"))
    name.appendChild(pin)
  }

  name.appendChild(element("span", "omb-row-name-text", bot.name))
  main.appendChild(name)

  let metaText
  if (!bot.sessionID) metaText = api.t("bot.startChat", "Start chat")
  else if (status === "running") metaText = api.t("bot.working", "working…")
  else if (status === "unread") metaText = api.t("bot.newActivity", "new")
  else if (panel && bot.tagline) metaText = bot.tagline
  else metaText = formatAgo(info?.time?.updated ?? bot.updatedAt)

  const meta = element("div", "omb-row-meta", metaText)
  meta.dataset.state = status
  main.appendChild(meta)
  row.appendChild(main)

  const dot = element("span", "omb-row-dot")
  dot.dataset.state = status
  row.appendChild(dot)

  const more = button("omb-row-more")
  more.innerHTML = ICONS.dots
  more.title = api.t("bot.edit", "Edit profile")
  more.setAttribute("aria-label", `${bot.name}: ${api.t("bot.edit", "Edit profile")}`)
  more.addEventListener("click", (event) => {
    event.preventDefault()
    event.stopPropagation()
    api.openBotMenu(more, bot)
  })
  row.appendChild(more)

  const open = () => void api.openBot(bot)
  row.addEventListener("click", open)
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      open()
    }
  })
  row.addEventListener("contextmenu", (event) => {
    event.preventDefault()
    event.stopPropagation()
    api.openBotMenuAt(event.clientX, event.clientY, bot)
  })

  return row
}

function buildChatRow(bot, api, options = {}) {
  const info = api.sessionInfo(bot.sessionID)
  const active = api.isActive(bot)
  const row = element("div", "omb-chat-row")

  row.tabIndex = 0
  row.setAttribute("role", "button")
  row.dataset.bot = bot.id
  row.title = info
    ? `Open ${bot.name}'s chat · ${formatAgo(info.time?.updated ?? bot.updatedAt)}`
    : `Open ${bot.name}'s chat`
  row.setAttribute("aria-label", row.title)
  if (active) row.dataset.active = ""

  const chatIcon = element("span", "omb-chat-icon")
  chatIcon.innerHTML = ICONS.chat
  row.appendChild(chatIcon)
  row.appendChild(element("span", "omb-chat-text", `Chat${active ? ` · ${api.t("bot.openChat", "open")}` : ""}`))

  const open = () => void api.openBot(bot)
  row.addEventListener("click", (event) => {
    event.stopPropagation()
    open()
  })
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      open()
    }
  })
  row.addEventListener("contextmenu", (event) => {
    event.preventDefault()
    event.stopPropagation()
    api.openBotMenuAt(event.clientX, event.clientY, bot)
  })

  return row
}

function buildBotGroup(bot, api, options = {}) {
  const group = element("div", "omb-group")

  group.appendChild(buildRow(bot, api, options))
  if (bot.sessionID) group.appendChild(buildChatRow(bot, api, options))

  return group
}

function createFold(ctx, api) {
  const root = element("section", "omb-fold")

  root.setAttribute("data-mausbot-fold", "")
  root.setAttribute("aria-label", api.t("bot.title", "Bots"))

  const head = element("div", "omb-fold-head")
  const toggle = button("omb-fold-toggle")
  toggle.setAttribute("aria-expanded", "true")

  const botIcon = element("span", "omb-fold-icon")
  botIcon.innerHTML = ICONS.bot
  toggle.appendChild(botIcon)
  toggle.appendChild(element("span", "omb-fold-title", api.t("bot.title", "Bots")))

  const count = element("span", "omb-fold-count")
  toggle.appendChild(count)
  head.appendChild(toggle)

  const actions = element("div", "omb-fold-actions")
  const add = button("omb-icon-btn")
  add.innerHTML = ICONS.plus
  add.title = api.t("bot.new", "New bot")
  add.setAttribute("aria-label", api.t("bot.new", "New bot"))
  add.addEventListener("click", (event) => {
    event.preventDefault()
    event.stopPropagation()
    api.openBotDialog()
  })
  actions.appendChild(add)

  const more = button("omb-icon-btn")
  more.innerHTML = ICONS.dots
  more.title = api.t("bot.manage", "Open bots panel")
  more.setAttribute("aria-label", api.t("bot.manage", "Open bots panel"))
  more.addEventListener("click", (event) => {
    event.preventDefault()
    event.stopPropagation()
    api.openHeaderMenu(more)
  })
  actions.appendChild(more)
  head.appendChild(actions)

  const chevronButton = button("omb-fold-chevron-btn")
  chevronButton.setAttribute("aria-expanded", "true")
  chevronButton.title = api.t("bot.collapseFold", "Collapse bots")
  chevronButton.setAttribute("aria-label", chevronButton.title)
  const chevron = element("span", "omb-fold-chevron")
  chevron.innerHTML = ICONS.chevron
  chevronButton.appendChild(chevron)
  head.appendChild(chevronButton)
  root.appendChild(head)

  const body = element("div", "omb-fold-body")
  root.appendChild(body)

  const toggleCollapsed = () => {
    api.mutate((settings) => {
      settings.collapsed = !settings.collapsed
    })
    applyCollapsed()
    api.schedulePaint()
  }

  toggle.addEventListener("click", toggleCollapsed)
  chevronButton.addEventListener("click", (event) => {
    event.preventDefault()
    event.stopPropagation()
    toggleCollapsed()
  })

  const applyCollapsed = () => {
    const collapsed = api.settings().collapsed === true

    if (collapsed) root.setAttribute("data-collapsed", "")
    else root.removeAttribute("data-collapsed")

    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true")
    chevronButton.setAttribute("aria-expanded", collapsed ? "false" : "true")
    chevronButton.title = collapsed ? api.t("bot.expandFold", "Expand bots") : api.t("bot.collapseFold", "Collapse bots")
    chevronButton.setAttribute("aria-label", chevronButton.title)
  }

  const paint = () => {
    const bots = api.sortedBots()
    const collapsed = api.settings().collapsed === true

    applyCollapsed()
    count.textContent = bots.length ? String(bots.length) : ""
    body.replaceChildren()

    if (!bots.length) {
      const empty = element("div", "omb-fold-empty")
      empty.appendChild(element("strong", undefined, api.t("bot.empty", "No bots yet")))
      empty.appendChild(element("span", undefined, api.t("bot.emptyHint", "Create a bot with its own personality, model and folder.")))

      const create = button("omb-create-link")
      create.appendChild(icon("plus"))
      create.appendChild(element("span", undefined, api.t("bot.create", "Create a bot")))
      create.addEventListener("click", () => api.openBotDialog())
      empty.appendChild(create)
      body.appendChild(empty)

      return
    }

    for (const bot of bots) body.appendChild(buildBotGroup(bot, api))

    const moreButton = button("omb-more-link")
    moreButton.appendChild(icon("plus"))
    moreButton.appendChild(element("span", undefined, api.t("bot.new", "New bot")))
    moreButton.addEventListener("click", () => api.openBotDialog())
    body.appendChild(moreButton)

    if (collapsed) return
  }

  api.registerPainter(root, paint)

  return root
}

function createPanelView(ctx, api) {
  const root = element("div", "omb-panel")
  const head = element("div", "omb-panel-head")
  head.appendChild(element("div", "omb-panel-title", api.t("panel.title", "Bots")))

  const sub = element("div", "omb-panel-sub")
  head.appendChild(sub)

  const add = button("omb-btn")
  add.appendChild(icon("plus"))
  add.appendChild(element("span", undefined, api.t("bot.new", "New bot")))
  add.addEventListener("click", () => api.openBotDialog())
  head.appendChild(add)
  root.appendChild(head)

  const list = element("div", "omb-panel-list")
  root.appendChild(list)

  const hint = element("div", "omb-panel-hint", api.t("panel.hint", "Each bot is a normal OpenCode session with its own personality, memory, model and folder."))
  root.appendChild(hint)

  const paint = () => {
    const bots = api.sortedBots()

    sub.textContent = bots.length ? String(bots.length) : ""
    list.replaceChildren()

    if (!bots.length) {
      const empty = element("div", "omb-panel-empty", api.t("panel.empty", "No bots yet. Create one to get started."))
      list.appendChild(empty)

      return
    }

    for (const bot of bots) list.appendChild(buildBotGroup(bot, api, { panel: true }))
  }

  api.registerPainter(root, paint)

  return root
}

module.exports = Plugin.define({
  i18n: I18N,
  ...(stores ? { stores } : {}),
  setup(ctx) {
    if (typeof document === "undefined") return

    ctx.add(Style, CSS)

    const painters = new Map()
    const creating = new Map()
    const disposers = []
    let foldEl
    let fallback = readLocalSettings()
    let subscribedData
    let subscriptions = []
    let mountTimer
    let paintTimer
    let paintQueued = false
    let menuCleanup
    let dialogCleanup

    const t = (key, fallbackText) => {
      try {
        const value = ctx.t(key)
        return value === key ? fallbackText ?? key : value
      } catch {
        return fallbackText ?? key
      }
    }

    const settings = () => ctx.stores?.settings?.value ?? fallback

    const mutate = (change) => {
      if (ctx.stores?.settings) {
        ctx.stores.settings.update((draft) => {
          change(draft)
        })
      } else {
        change(fallback)
        writeLocalSettings(fallback)
      }

      schedulePaint()
    }

    const bots = () => settings().bots ?? []
    const botById = (id) => bots().find((bot) => bot.id === id)

    const sessionInfo = (id) => {
      if (!id) return undefined

      try {
        return ctx.servers.get("sidecar")?.data?.session?.get?.(id)
      } catch {
        return undefined
      }
    }

    const isActive = (bot) => {
      if (!bot?.sessionID) return false

      try {
        const current = ctx.sessions.current()

        if (current?.id === bot.sessionID) return true

        return ctx.tabs.list().some((tab) => tab.session?.id === bot.sessionID && tab.active)
      } catch {
        return false
      }
    }

    const sessionStatus = (bot) => {
      if (!bot.sessionID) return "idle"

      try {
        const status = ctx.servers.get("sidecar")?.data?.session?.status?.(bot.sessionID)

        if (status === "running" || status?.type === "running") return "running"
      } catch {}

      // A chat the user is looking at is not "new", even while its messages
      // keep updating the session timestamp.
      if (isActive(bot)) return "idle"

      const info = sessionInfo(bot.sessionID)

      if (info && Number(info.time?.updated ?? 0) > Number(info.time?.viewed ?? 0)) return "unread"

      return "idle"
    }

    const activityOf = (bot) => Number(sessionInfo(bot.sessionID)?.time?.updated ?? bot.updatedAt ?? 0)
    const sorted = () => sortedBots(bots(), sessionStatus, activityOf)

    // A bot's current chat belongs in the roster, not in the normal tab strip
    // or Home list. The app has no API for hidden sessions, so we mark only the
    // session list rows it renders. The chat itself is still a normal OpenCode
    // tab, and older chats from "New chat" stay in Recent like any session.
    const hideBotSessions = () => {
      if (typeof document === "undefined") return

      const known = new Set(bots().map((bot) => bot.sessionID).filter(Boolean))
      const isBotSession = (id) => Boolean(id) && known.has(id)

      for (const node of document.querySelectorAll("[data-session-id]")) {
        const id = node.getAttribute("data-session-id")

        if (isBotSession(id)) node.setAttribute("data-mausbot-hidden", "")
        else node.removeAttribute("data-mausbot-hidden")
      }

      for (const node of document.querySelectorAll("[data-titlebar-tab-slot]")) {
        const key = node.getAttribute("data-tab-key") || ""
        const link = node.querySelector('a[href*="/session/"]')?.getAttribute("href") || ""
        const id = key.split("/session/").pop() || link.match(/\/session\/([^/?#]+)/)?.[1] || ""

        if (isBotSession(id)) node.setAttribute("data-mausbot-hidden", "")
        else node.removeAttribute("data-mausbot-hidden")
      }

      // Session search results carry the session id URL-encoded in their DOM id.
      for (const node of document.querySelectorAll('[data-slot="search-list-row"][id]')) {
        let raw = node.id

        try {
          raw = decodeURIComponent(raw)
        } catch {}

        const match = raw.match(/ses_[A-Za-z0-9]+/)

        if (match && isBotSession(match[0])) node.setAttribute("data-mausbot-hidden", "")
        else node.removeAttribute("data-mausbot-hidden")
      }
    }

    const registerPainter = (root, paint) => {
      painters.set(root, paint)
      try {
        paint()
      } catch (error) {
        console.warn("[mausbot] could not paint a view", error)
      }
    }

    const paintAll = () => {
      for (const [root, paint] of [...painters]) {
        if (!root.isConnected && root !== foldEl) {
          painters.delete(root)
          continue
        }

        try {
          paint()
        } catch (error) {
          console.warn("[mausbot] could not paint the roster", error)
        }
      }

      hideBotSessions()
    }

    const schedulePaint = () => {
      if (paintQueued) return

      paintQueued = true
      Promise.resolve().then(() => {
        paintQueued = false
        paintAll()
      })
    }

    const toast = (variant, title, description) => {
      try {
        ctx.toast.show({ variant, title, description })
      } catch {}
    }

    const showError = (title, error) => {
      const message = error?.message ? String(error.message) : String(error ?? "")

      console.warn(`[mausbot] ${title}`, error)
      toast("error", title, message)
    }

    const currentDirectory = () => {
      try {
        return ctx.sessions.current()?.directory ?? ctx.sessions.list()[0]?.directory ?? ""
      } catch {
        return ""
      }
    }

    const closeMenu = () => {
      if (menuCleanup) menuCleanup()
    }

    const closeDialog = () => {
      if (dialogCleanup) dialogCleanup()
    }

    const openMenu = (anchor, items, point) => {
      closeMenu()

      const menu = element("div", "omb-menu")
      menu.setAttribute("role", "menu")

      for (const item of items) {
        if (item.separator) {
          menu.appendChild(element("div", "omb-menu-sep"))
          continue
        }

        const row = button("omb-menu-item")
        const iconSlot = element("span", "omb-menu-icon")
        iconSlot.innerHTML = item.icon ? ICONS[item.icon] ?? "" : ""
        row.appendChild(iconSlot)
        row.appendChild(element("span", "omb-menu-label", item.label))
        row.setAttribute("role", "menuitem")
        if (item.danger) row.dataset.danger = ""

        row.addEventListener("click", () => {
          closeMenu()
          item.run()
        })
        menu.appendChild(row)
      }

      document.body.appendChild(menu)

      const rect = point
        ? { left: point.x, top: point.y, bottom: point.y }
        : anchor.getBoundingClientRect()
      const width = menu.offsetWidth
      const height = menu.offsetHeight
      let left = point ? point.x : rect.left
      let top = point ? point.y : rect.bottom + 4

      left = Math.max(8, Math.min(left, window.innerWidth - width - 8))

      if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 4)

      menu.style.left = `${left}px`
      menu.style.top = `${top}px`

      const onPointerDown = (event) => {
        if (!menu.contains(event.target)) closeMenu()
      }
      const onKeyDown = (event) => {
        if (event.key !== "Escape") return

        event.preventDefault()
        event.stopPropagation()
        closeMenu()
      }

      let closed = false
      setTimeout(() => {
        if (!closed) document.addEventListener("mousedown", onPointerDown, true)
      }, 0)
      document.addEventListener("keydown", onKeyDown, true)

      menuCleanup = () => {
        closed = true
        document.removeEventListener("mousedown", onPointerDown, true)
        document.removeEventListener("keydown", onKeyDown, true)
        menu.remove()
        menuCleanup = undefined
      }
    }

    const loadModels = async (directory) => {
      try {
        const result = await ctx.client.model.list({ location: { directory } })
        const list = result?.data ?? result

        if (!Array.isArray(list)) return []

        return list.filter((model) => model?.enabled !== false)
      } catch {
        return []
      }
    }

    const createSessionForBot = async (bot) => {
      if (!bot.directory) throw new Error(t("dialog.folderRequired", "Choose a folder for the bot."))

      const body = {
        title: bot.name,
        location: { directory: bot.directory },
        metadata: { [META_KEY]: profileOf(bot) },
        permissions: permissionRules(bot.permissions),
      }

      if (bot.model?.providerID && bot.model?.modelID) {
        body.model = { providerID: bot.model.providerID, id: bot.model.modelID }
      }

      let session

      try {
        session = await ctx.client.session.create({ ...body, agent: "build" })
      } catch {
        session = await ctx.client.session.create(body)
      }

      if (!session?.id) throw new Error("The server did not return a session.")

      return session
    }

    const updateSessionForBot = async (bot, previous) => {
      if (!bot.sessionID) return

      try {
        const info = await ctx.client.session.get({ sessionID: bot.sessionID })
        const metadata = { ...(info?.metadata ?? {}), [META_KEY]: profileOf(bot) }

        await ctx.client.session.update({
          sessionID: bot.sessionID,
          title: bot.name,
          metadata,
          permissions: mergePermissions(info?.permissions, bot.permissions),
        })

        const modelChanged =
          previous &&
          (previous.model?.providerID !== bot.model?.providerID || previous.model?.modelID !== bot.model?.modelID)

        if (modelChanged && bot.model?.providerID && bot.model?.modelID) {
          await ctx.client.session.switchModel({
            sessionID: bot.sessionID,
            model: { providerID: bot.model.providerID, id: bot.model.modelID },
          })
        }

        if (previous && previous.directory !== bot.directory) {
          try {
            await ctx.client.session.move({ sessionID: bot.sessionID, directory: bot.directory })
          } catch (moveError) {
            mutate((state) => {
              const current = state.bots.find((entry) => entry.id === bot.id)
              if (current) current.directory = previous.directory
            })
            showError(t("toast.moveFailed", "Couldn't move the chat to the new folder, so the old folder was kept."), moveError)
          }
        }
      } catch (error) {
        showError(t("toast.updateFailed", "Couldn't update the bot's chat"), error)
      }
    }

    const ensureSession = async (bot) => {
      // An existing id is trusted. The desktop opens it if the server still
      // has it; use "New chat" in the bot menu to replace a dead transcript.
      if (bot.sessionID) return bot.sessionID

      const pending = creating.get(bot.id)
      if (pending) return pending

      const task = (async () => {
        const session = await createSessionForBot(bot)

        mutate((state) => {
          const current = state.bots.find((entry) => entry.id === bot.id)
          if (current) {
            current.sessionID = session.id
            current.updatedAt = Date.now()
          }
        })

        return session.id
      })().finally(() => creating.delete(bot.id))

      creating.set(bot.id, task)

      return task
    }

    const openChatTab = (id) => {
      ctx.tabs.open({ server: "sidecar", id }, { focus: true })
      hideBotSessions()
      setTimeout(hideBotSessions, 50)
      setTimeout(hideBotSessions, 250)
    }

    const openBot = async (bot) => {
      try {
        const id = await ensureSession(bot)
        openChatTab(id)
      } catch (error) {
        showError(t("toast.missing", "This bot has no chat yet. Click it to start one."), error)
      }
    }

    const newChat = async (bot) => {
      if (bot.sessionID) {
        let confirmed = false

        try {
          confirmed = await ctx.dialogs.confirm({
            title: t("bot.newChatTitle", "Start a new chat?"),
            description: t(
              "bot.newChatBody",
              "The bot will get a fresh transcript and keep its personality, memory and folder. Its old chat stays in Recent.",
            ),
            confirm: t("bot.newChat", "New chat"),
          })
        } catch {}

        if (!confirmed) return
      }

      try {
        const session = await createSessionForBot({ ...bot, sessionID: "" })

        mutate((state) => {
          const current = state.bots.find((entry) => entry.id === bot.id)
          if (current) {
            current.sessionID = session.id
            current.updatedAt = Date.now()
          }
        })

        openChatTab(session.id)
      } catch (error) {
        showError(t("toast.createFailed", "Couldn't create the bot's chat"), error)
      }
    }

    const togglePin = (bot) => {
      mutate((state) => {
        const current = state.bots.find((entry) => entry.id === bot.id)
        if (current) {
          current.pinned = !current.pinned
          current.updatedAt = Date.now()
        }
      })
    }

    const copyChatId = async (bot) => {
      if (!bot.sessionID) {
        toast("warning", t("toast.missing", "This bot has no chat yet. Click it to start one."))
        return
      }

      try {
        await ctx.system.copy(bot.sessionID)
        toast("success", t("toast.copied", "Chat ID copied."))
      } catch (error) {
        showError("Couldn't copy the chat ID", error)
      }
    }

    const closeChatTab = (bot) => {
      if (!bot.sessionID) return

      try {
        const tab = ctx.tabs.list().find((entry) => entry.session?.id === bot.sessionID)
        if (tab) ctx.tabs.close(tab.key)
      } catch {}
    }

    const duplicateBot = async (bot) => {
      const copy = normalizeBot({
        ...clone(bot),
        id: nextID(),
        name: `${bot.name} copy`,
        sessionID: "",
        pinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })

      mutate((state) => {
        state.bots.push(copy)
      })

      try {
        const session = await createSessionForBot(copy)

        mutate((state) => {
          const current = state.bots.find((entry) => entry.id === copy.id)
          if (current) current.sessionID = session.id
        })
      } catch (error) {
        showError(t("toast.createFailed", "Couldn't create the bot's chat"), error)
      }
    }

    const deleteBot = async (bot) => {
      let confirmed = false

      try {
        confirmed = await ctx.dialogs.confirm({
          title: t("delete.title", "Delete bot?"),
          description: t("delete.body", "This deletes {name} and its chat. This can't be undone.").replace("{name}", bot.name),
          confirm: t("delete.confirm", "Delete"),
          danger: true,
        })
      } catch {
        confirmed = false
      }

      if (!confirmed) return

      if (bot.sessionID) {
        try {
          await ctx.client.session.remove({ sessionID: bot.sessionID })
        } catch (error) {
          showError("Couldn't delete the bot's chat", error)
          return
        }

        try {
          const tab = ctx.tabs.list().find((entry) => entry.session?.id === bot.sessionID)
          if (tab) ctx.tabs.close(tab.key)
        } catch {}
      }

      mutate((state) => {
        state.bots = state.bots.filter((entry) => entry.id !== bot.id)
      })
    }

    const openPanel = () => {
      let session

      try {
        session = ctx.sessions.current()
      } catch {}

      if (!session) {
        toast("warning", t("toast.noSession", "Open a chat first, then open the Bots panel."))
        return
      }

      try {
        ctx.layout.open(`${ctx.id}:bots`, session, { tab: "select" })
      } catch (error) {
        showError("Couldn't open the Bots panel", error)
      }
    }

    const toggleFold = () => {
      mutate((state) => {
        state.showFold = !state.showFold
      })
      ensureFold()
      schedulePaint()
    }

    const openChatPicker = async () => {
      const list = sorted()

      if (!list.length) {
        openBotDialog()
        return
      }

      let picked

      try {
        picked = await ctx.dialogs.select({
          title: t("command.chat", "Chat with a bot…"),
          placeholder: t("command.chat", "Chat with a bot…"),
          options: list.map((bot) => ({
            title: `${bot.emoji || "🤖"} ${bot.name}`,
            description: bot.tagline || bot.directory,
            value: bot.id,
          })),
        })
      } catch (error) {
        showError("Couldn't open the bot picker", error)
        return
      }

      if (!picked) return

      const bot = botById(picked)
      if (bot) await openBot(bot)
    }

    const openBotMenuAt = (x, y, bot) => {
      openBotMenu(undefined, bot, { x, y })
    }

    const openBotMenu = (anchor, bot, point) => {
      openMenu(
        anchor,
        [
          { label: t("bot.chat", "Chat"), icon: "chat", run: () => void openBot(bot) },
          { label: t("bot.newChat", "New chat"), icon: "plus", run: () => void newChat(bot) },
          { label: t("bot.edit", "Edit profile"), icon: "edit", run: () => openBotDialog(bot) },
          { label: t("bot.duplicate", "Duplicate"), icon: "copy", run: () => void duplicateBot(bot) },
          {
            label: bot.pinned ? t("bot.unpin", "Unpin") : t("bot.pin", "Pin"),
            icon: "pin",
            run: () => togglePin(bot),
          },
          { label: t("bot.copyId", "Copy chat ID"), icon: "copy", run: () => void copyChatId(bot) },
          ...(bot.sessionID
            ? [{ label: t("bot.closeChat", "Close chat tab"), icon: "close", run: () => closeChatTab(bot) }]
            : []),
          { separator: true },
          { label: t("bot.delete", "Delete"), icon: "trash", danger: true, run: () => void deleteBot(bot) },
        ],
        point,
      )
    }

    const openHeaderMenu = (anchor) => {
      openMenu(anchor, [
        { label: t("bot.new", "New bot"), icon: "plus", run: () => openBotDialog() },
        { label: t("menu.manage", "Open bots panel"), icon: "bot", run: openPanel },
        { separator: true },
        {
          label: t("bot.hideFold", "Hide bots fold"),
          icon: "close",
          run: () => {
            mutate((state) => {
              state.showFold = false
            })
            ensureFold()
          },
        },
      ])
    }

    const openBotDialog = (existing) => {
      closeDialog()
      closeMenu()

      const editing = Boolean(existing)
      const draft = editing
        ? normalizeBot(clone(existing))
        : normalizeBot({
            id: nextID(),
            name: "",
            emoji: "🤖",
            color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            tagline: "",
            instructions: "",
            directory: currentDirectory(),
            permissions: "ask",
            model: (() => {
              try {
                const model = ctx.screen.current()?.composer.model()
                return model ? { providerID: model.providerID, modelID: model.modelID } : { providerID: "", modelID: "" }
              } catch {
                return { providerID: "", modelID: "" }
              }
            })(),
          })

      const overlay = element("div", "omb-overlay")
      overlay.setAttribute("data-mausbot-dialog", "")

      const dialog = element("div", "omb-dialog")
      dialog.setAttribute("role", "dialog")
      dialog.setAttribute("aria-modal", "true")
      overlay.appendChild(dialog)

      const head = element("div", "omb-dialog-head")
      const headMain = element("div", "omb-dialog-head-main")
      headMain.appendChild(element("div", "omb-dialog-title", editing ? t("dialog.editTitle", "Edit bot") : t("dialog.newTitle", "New bot")))
      headMain.appendChild(element("div", "omb-dialog-sub", t("dialog.subtitle", "A bot is a chat with its own personality, model, folder and memory.")))
      head.appendChild(headMain)

      const close = button("omb-dialog-close")
      close.innerHTML = ICONS.close
      close.title = t("dialog.cancel", "Cancel")
      close.setAttribute("aria-label", t("dialog.cancel", "Cancel"))
      head.appendChild(close)
      dialog.appendChild(head)

      const form = document.createElement("form")
      form.className = "omb-form"
      dialog.appendChild(form)

      const identity = element("div", "omb-identity")
      const preview = element("div", "omb-avatar-preview", draft.emoji || "🤖")
      identity.appendChild(preview)

      const identityFields = element("div", "omb-identity-fields")
      const nameField = element("label", "omb-field")
      nameField.appendChild(element("span", "omb-label", t("dialog.name", "Name")))
      const nameInput = document.createElement("input")
      nameInput.className = "omb-input"
      nameInput.value = draft.name
      nameInput.placeholder = t("dialog.namePlaceholder", "e.g. Scout")
      nameInput.required = true
      nameInput.autocomplete = "off"
      nameField.appendChild(nameInput)
      identityFields.appendChild(nameField)

      const taglineField = element("label", "omb-field")
      taglineField.appendChild(element("span", "omb-label", t("dialog.tagline", "Tagline")))
      const taglineInput = document.createElement("input")
      taglineInput.className = "omb-input"
      taglineInput.value = draft.tagline
      taglineInput.placeholder = t("dialog.taglinePlaceholder", "A short line about this bot")
      taglineInput.autocomplete = "off"
      taglineField.appendChild(taglineInput)
      identityFields.appendChild(taglineField)
      identity.appendChild(identityFields)
      form.appendChild(identity)

      const emojiColor = element("div", "omb-grid")
      const emojiField = element("label", "omb-field")
      emojiField.appendChild(element("span", "omb-label", t("dialog.emoji", "Emoji")))
      const emojiInput = document.createElement("input")
      emojiInput.className = "omb-input"
      emojiInput.value = draft.emoji || "🤖"
      emojiInput.maxLength = 8
      emojiField.appendChild(emojiInput)
      emojiColor.appendChild(emojiField)

      const colorField = element("div", "omb-field")
      colorField.appendChild(element("span", "omb-label", t("dialog.color", "Colour")))
      const colorRow = element("div", "omb-color-row")
      const swatches = element("div", "omb-swatches")
      const paintSwatches = () => {
        for (const swatch of swatches.children) {
          if (swatch.dataset.color === draft.color) swatch.setAttribute("data-current", "")
          else swatch.removeAttribute("data-current")
        }
      }

      for (const color of PALETTE) {
        const swatch = button("omb-swatch")
        swatch.dataset.color = color
        swatch.style.background = color
        swatch.title = color
        swatch.setAttribute("aria-label", color)
        swatch.addEventListener("click", () => {
          draft.color = color
          paintSwatches()
          paintPreview()
        })
        swatches.appendChild(swatch)
      }
      colorRow.appendChild(swatches)
      colorField.appendChild(colorRow)
      emojiColor.appendChild(colorField)
      form.appendChild(emojiColor)

      const paintPreview = () => {
        preview.textContent = emojiInput.value.trim() || "🤖"
        preview.style.background = hexAlpha(draft.color, 0.16)
        preview.style.borderColor = hexAlpha(draft.color, 0.48)
      }
      paintSwatches()
      paintPreview()
      emojiInput.addEventListener("input", paintPreview)

      if (!editing) {
        const templates = element("div", "omb-field")
        templates.appendChild(element("span", "omb-label", t("dialog.templates", "Start from a template")))
        const chips = element("div", "omb-templates")

        for (const template of TEMPLATES) {
          const chip = button("omb-chip", `${template.emoji} ${template.name}`)
          chip.addEventListener("click", () => {
            nameInput.value = template.name
            emojiInput.value = template.emoji
            taglineInput.value = template.tagline
            personaInput.value = template.instructions
            draft.color = template.color
            paintSwatches()
            paintPreview()
          })
          chips.appendChild(chip)
        }

        templates.appendChild(chips)
        form.appendChild(templates)
      }

      const personaField = element("label", "omb-field")
      personaField.appendChild(element("span", "omb-label", t("dialog.persona", "Personality & instructions")))
      const personaInput = document.createElement("textarea")
      personaInput.className = "omb-input"
      personaInput.value = draft.instructions
      personaInput.placeholder = t(
        "dialog.personaPlaceholder",
        "You are Scout, a calm research assistant. You dig into sources, keep notes, and explain what you found…",
      )
      personaField.appendChild(personaInput)
      personaField.appendChild(element("span", "omb-hint", t("dialog.personaHint", "This is the bot's system prompt. Tell it who it is, how it speaks, and what it is for.")))
      form.appendChild(personaField)

      const grid = element("div", "omb-grid")
      const modelField = element("label", "omb-field")
      modelField.appendChild(element("span", "omb-label", t("dialog.model", "Model")))
      const modelSelect = document.createElement("select")
      modelSelect.className = "omb-input"
      const defaultModel = new Option(t("dialog.modelDefault", "Workspace default"), "")
      modelSelect.appendChild(defaultModel)
      modelField.appendChild(modelSelect)
      grid.appendChild(modelField)

      const approvalField = element("label", "omb-field")
      approvalField.appendChild(element("span", "omb-label", t("dialog.approvals", "Approvals")))
      const approvalSelect = document.createElement("select")
      approvalSelect.className = "omb-input"
      for (const [value, key, fallbackText] of APPROVALS) {
        const option = new Option(t(key, fallbackText), value)
        approvalSelect.appendChild(option)
      }
      approvalSelect.value = draft.permissions
      approvalField.appendChild(approvalSelect)
      grid.appendChild(approvalField)
      form.appendChild(grid)

      let modelsRequest = 0
      const fillModels = async (directory) => {
        const request = ++modelsRequest
        const current = draft.model

        while (modelSelect.options.length > 1) modelSelect.remove(1)
        const loading = new Option(t("dialog.modelLoading", "Loading models…"), "__loading__")
        loading.disabled = true
        modelSelect.appendChild(loading)

        const models = await loadModels(directory)
        if (request !== modelsRequest) return

        while (modelSelect.options.length > 1) modelSelect.remove(1)

        const known = new Set()
        const groups = new Map()

        for (const model of models) {
          if (!model?.providerID || !model?.modelID) continue

          const key = encodeModel(model)
          if (known.has(key)) continue
          known.add(key)

          const groupKey = model.providerID
          if (!groups.has(groupKey)) groups.set(groupKey, [])
          groups.get(groupKey).push(model)
        }

        if (current.providerID && current.modelID && !known.has(encodeModel(current))) {
          const group = document.createElement("optgroup")
          group.label = "Current"
          group.appendChild(new Option(`${current.providerID} / ${current.modelID} (unavailable)`, encodeModel(current)))
          modelSelect.appendChild(group)
        }

        const providers = [...groups.keys()].sort((left, right) => left.localeCompare(right))

        for (const providerID of providers) {
          const group = document.createElement("optgroup")
          group.label = providerID
          const list = groups.get(providerID).sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? "")))

          for (const model of list) group.appendChild(new Option(model.name || model.modelID, encodeModel(model)))

          modelSelect.appendChild(group)
        }

        modelSelect.value = current.providerID && current.modelID ? encodeModel(current) : ""
      }

      approvalSelect.value = draft.permissions
      void fillModels(draft.directory)

      const folderField = element("label", "omb-field")
      folderField.appendChild(element("span", "omb-label", t("dialog.folder", "Folder")))
      const folderRow = element("div", "omb-folder-row")
      const folderInput = document.createElement("input")
      folderInput.className = "omb-input"
      folderInput.value = draft.directory
      folderInput.placeholder = currentDirectory() || "/path/to/project"
      folderInput.autocomplete = "off"
      folderRow.appendChild(folderInput)

      const choose = button("omb-btn")
      choose.textContent = t("dialog.choose", "Choose…")
      choose.addEventListener("click", async () => {
        if (!ctx.desktop?.pick) {
          toast("warning", "Choosing a folder is only available in the desktop app.")
          return
        }

        try {
          const picked = await ctx.desktop.pick({ directory: true, title: t("dialog.folder", "Folder") })
          if (picked?.[0]) {
            folderInput.value = picked[0]
            void fillModels(picked[0])
          }
        } catch (error) {
          showError("Couldn't open the folder picker", error)
        }
      })
      folderRow.appendChild(choose)
      folderField.appendChild(folderRow)
      folderField.appendChild(element("span", "omb-hint", t("dialog.folderHint", "The bot works in this folder. Choose a project or a dedicated bot folder.")))
      form.appendChild(folderField)

      let openAfter
      if (!editing) {
        const check = element("label", "omb-check")
        openAfter = document.createElement("input")
        openAfter.type = "checkbox"
        openAfter.checked = true
        check.appendChild(openAfter)
        check.appendChild(element("span", undefined, t("dialog.openAfter", "Open the chat when created")))
        form.appendChild(check)
      }

      const error = element("div", "omb-error")
      form.appendChild(error)

      const actions = element("div", "omb-actions")
      const cancel = button("omb-btn", t("dialog.cancel", "Cancel"))
      const submit = button("omb-btn", editing ? t("dialog.save", "Save") : t("dialog.create", "Create bot"))
      submit.type = "submit"
      submit.dataset.variant = "primary"
      actions.appendChild(cancel)
      actions.appendChild(submit)
      form.appendChild(actions)

      let busy = false
      const setBusy = (value, label) => {
        busy = value
        submit.disabled = value
        cancel.disabled = value
        close.disabled = value
        submit.textContent = value ? label : editing ? t("dialog.save", "Save") : t("dialog.create", "Create bot")
      }

      const finish = () => closeDialog()
      close.addEventListener("click", finish)
      cancel.addEventListener("click", finish)

      overlay.addEventListener("mousedown", (event) => {
        if (event.target === overlay && !busy) finish()
      })

      const onKeyDown = (event) => {
        if (event.key !== "Escape" || busy) return

        event.preventDefault()
        event.stopPropagation()
        finish()
      }
      document.addEventListener("keydown", onKeyDown, true)

      form.addEventListener("submit", async (event) => {
        event.preventDefault()
        error.textContent = ""

        const value = {
          name: String(nameInput.value ?? "").trim(),
          emoji: String(emojiInput.value ?? "").trim() || "🤖",
          color: draft.color,
          tagline: String(taglineInput.value ?? "").trim(),
          instructions: String(personaInput.value ?? "").trim(),
          directory: String(folderInput.value ?? "").trim(),
          permissions: approvalSelect.value,
          model: decodeModel(modelSelect.value),
        }

        if (!value.name) {
          error.textContent = t("dialog.nameRequired", "Give the bot a name.")
          nameInput.focus()
          return
        }

        if (!value.directory) {
          error.textContent = t("dialog.folderRequired", "Choose a folder for the bot.")
          folderInput.focus()
          return
        }

        setBusy(true, editing ? t("dialog.saving", "Saving…") : t("dialog.creating", "Creating…"))

        try {
          if (editing) {
            const previous = clone(existing)
            const updated = normalizeBot({ ...existing, ...value, updatedAt: Date.now() })

            mutate((state) => {
              const index = state.bots.findIndex((bot) => bot.id === existing.id)
              if (index >= 0) state.bots[index] = updated
            })

            await updateSessionForBot(updated, previous)
            finish()
          } else {
            const created = normalizeBot({ ...draft, ...value, updatedAt: Date.now() })

            mutate((state) => {
              state.bots.push(created)
            })

            let session

            try {
              session = await createSessionForBot(created)
            } catch (createError) {
              showError(t("toast.createFailed", "Couldn't create the bot's chat"), createError)
            }

            if (session?.id) {
              mutate((state) => {
                const current = state.bots.find((bot) => bot.id === created.id)
                if (current) current.sessionID = session.id
              })
            }

            finish()

            if (session?.id && (!openAfter || openAfter.checked)) {
              try {
                openChatTab(session.id)
              } catch (openError) {
                showError("Couldn't open the bot's chat", openError)
              }
            }
          }
        } catch (updateError) {
          error.textContent =
            (editing ? t("dialog.saveFailed", "Couldn't update the bot: ") : t("dialog.failed", "Couldn't create the bot: ")) +
            (updateError?.message ?? String(updateError))
          setBusy(false)
        }
      })

      document.body.appendChild(overlay)

      dialogCleanup = () => {
        document.removeEventListener("keydown", onKeyDown, true)
        overlay.remove()
        dialogCleanup = undefined
      }

      setTimeout(() => nameInput.focus(), 0)
    }

    const api = {
      t,
      settings,
      bots,
      botById,
      mutate,
      sortedBots: sorted,
      registerPainter,
      schedulePaint,
      paintAll,
      sessionInfo,
      sessionStatus,
      isActive,
      hideBotSessions,
      currentDirectory,
      toast,
      showError,
      openBot,
      openBotMenu,
      openBotMenuAt,
      openBotDialog,
      openHeaderMenu,
      openPanel,
      toggleFold,
      openChatPicker,
      closeMenu,
    }

    const ensureFold = () => {
      if (!foldEl) return

      if (settings().showFold === false) {
        if (foldEl.parentElement) foldEl.remove()
        return
      }

      // Current desktops: the Archive fold is a real sidebar section. Put the
      // bots directly after it, which also keeps them above the sidebar footer
      // (and above widgets such as the OpenCode Go usage card).
      const archive = document.querySelector('[data-slot="sidebar-archive"]')

      if (archive?.parentElement) {
        if (foldEl.parentElement === archive.parentElement && foldEl.previousElementSibling === archive) return
        archive.insertAdjacentElement("afterend", foldEl)
        return
      }

      // Older session-inbox sidebars had an "Archived" button at the bottom of
      // the list. Keep supporting that layout.
      const inbox = document.querySelector('[data-slot="sidebar-inbox"]')

      if (inbox) {
        const labels = new Set(
          [t("common.archive", "Archive"), t("sidebar.inbox.section.archived", "Archived"), "Archive", "Archived"]
            .filter(Boolean)
            .map((label) => String(label).trim().toLowerCase()),
        )
        const archiveButton = [...inbox.querySelectorAll("button")].find((buttonEl) =>
          labels.has(String(buttonEl.textContent ?? "").trim().toLowerCase()),
        )
        let anchor = archiveButton ? [...inbox.children].find((child) => child.contains(archiveButton)) : undefined

        if (!anchor || anchor === foldEl) {
          const children = [...inbox.children].filter((child) => child !== foldEl)
          anchor = children[children.length - 1]
        }

        if (anchor) {
          if (foldEl.parentElement === inbox && foldEl.previousElementSibling === anchor) return
          anchor.insertAdjacentElement("afterend", foldEl)
          return
        }

        if (foldEl.parentElement !== inbox) inbox.appendChild(foldEl)
        return
      }

      const scroll = document.querySelector('[data-slot="vertical-tabs-scroll"]')

      if (scroll) {
        if (foldEl.parentElement !== scroll) scroll.appendChild(foldEl)
        return
      }

      const mount = document.querySelector('[data-slot="vertical-tabs-mount"]')

      if (mount) {
        const before = mount.querySelector("[data-go-usage]") ?? mount.querySelector('[data-slot="vertical-tabs-footer"]')

        if (foldEl.parentElement !== mount || (before && foldEl.nextElementSibling !== before)) {
          mount.insertBefore(foldEl, before ?? null)
        }
      }
    }

    const syncDataEvents = () => {
      let data

      try {
        data = ctx.servers.get("sidecar")?.data
      } catch {
        return
      }

      if (data === subscribedData) return

      for (const off of subscriptions) {
        try {
          off()
        } catch {}
      }

      subscriptions = []
      subscribedData = data

      if (!data?.on) return

      const types = [
        "session.created",
        "session.updated",
        "session.renamed",
        "session.metadata.updated",
        "session.permissions",
        "session.archived",
        "session.unarchived",
        "session.viewed",
        "session.deleted",
        "session.execution.started",
        "session.execution.succeeded",
        "session.execution.failed",
        "session.execution.interrupted",
      ]

      for (const type of types) {
        try {
          const off = data.on(type, () => {
            ensureFold()
            schedulePaint()
          })

          if (typeof off === "function") subscriptions.push(off)
        } catch {}
      }
    }

    foldEl = createFold(ctx, api)
    ensureFold()

    for (const [id, title, keywords, section, run] of [
      ["new", t("command.new", "New bot"), "bot agent mausbot create", "general", () => openBotDialog()],
      ["open", t("command.open", "Open bots panel"), "bots roster panel manage", "navigation", openPanel],
      ["chat", t("command.chat", "Chat with a bot…"), "bot chat talk open", "navigation", () => void openChatPicker()],
      ["toggle", t("command.toggle", "Toggle bots fold"), "sidebar fold show hide", "navigation", toggleFold],
    ]) {
      ctx.add(Command, () => ({
        id,
        title,
        description: id === "new" ? t("dialog.subtitle", "A bot is a chat with its own personality, model, folder and memory.") : undefined,
        keywords,
        group: t("group", "MausBot"),
        section,
        run,
      }))
    }

    ctx.add(MenuItem, () => {
      const session = ctx.sessions.current() ?? ctx.sessions.list()[0]
      const count = bots().length

      return {
        menu: "session.panel",
        id: "bots",
        title: t("panel.title", "Bots"),
        order: 70,
        icon: "brain",
        description: count ? String(count) : undefined,
        opened: Boolean(session) && ctx.layout.state(`${ctx.id}:bots`, session) !== "closed",
        run: openPanel,
      }
    })

    const panelTab = {
      id: "bots",
      get title() {
        return t("panel.title", "Bots")
      },
      closable: "compact",
      fallback: false,
    }

    ctx.add(Panel, {
      id: "bots",
      region: "side",
      width: 330,
      mobile: {
        get title() {
          return t("panel.title", "Bots")
        },
        order: 70,
        kind: "menu",
        icon: "brain",
      },
      list: (input) => (input.open.includes("bots") ? [panelTab] : []),
      render: () => createPanelView(ctx, api),
    })

    if (typeof window !== "undefined") {
      const onStorage = (event) => {
        if (event.key !== STORAGE_KEY || ctx.stores?.settings) return

        fallback = readLocalSettings()
        ensureFold()
        schedulePaint()
      }

      window.addEventListener("storage", onStorage)
      disposers.push(() => window.removeEventListener("storage", onStorage))
    }

    syncDataEvents()
    schedulePaint()

    mountTimer = setInterval(() => {
      ensureFold()
      hideBotSessions()
      syncDataEvents()
    }, 1_000)

    paintTimer = setInterval(() => {
      paintAll()
      ensureFold()
      hideBotSessions()
    }, 30_000)

    return () => {
      clearInterval(mountTimer)
      clearInterval(paintTimer)
      closeMenu()
      closeDialog()

      for (const off of subscriptions) {
        try {
          off()
        } catch {}
      }

      for (const dispose of disposers) {
        try {
          dispose()
        } catch {}
      }

      for (const node of document.querySelectorAll("[data-mausbot-hidden]")) {
        node.removeAttribute("data-mausbot-hidden")
      }

      if (foldEl) foldEl.remove()
      painters.clear()
    }
  },
})
