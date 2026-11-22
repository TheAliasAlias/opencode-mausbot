#!/usr/bin/env sh
# Install MausBot into the global OpenCode config.
set -eu

SRC=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CONFIG_DIR=${OPENCODE_CONFIG_DIR:-"$HOME/.config/opencode"}
PLUGIN_DIR="$CONFIG_DIR/plugins/opencode-mausbot"
CONFIG="$CONFIG_DIR/opencode.json"

if [ "$SRC" = "$PLUGIN_DIR" ]; then
  echo "Already running from $PLUGIN_DIR"
else
  mkdir -p "$PLUGIN_DIR"
  cp "$SRC/package.json" "$SRC/index.js" "$SRC/gui-experimental.cjs" "$SRC/README.md" "$SRC/LICENSE" "$PLUGIN_DIR/"
  if [ -d "$SRC/docs" ]; then
    mkdir -p "$PLUGIN_DIR/docs"
    cp "$SRC"/docs/* "$PLUGIN_DIR/docs/" 2>/dev/null || true
  fi
  echo "Copied the plugin to $PLUGIN_DIR"
fi

if command -v python3 >/dev/null 2>&1; then
  python3 - "$CONFIG" "$PLUGIN_DIR" <<'PY'
import json
import pathlib
import sys

config = pathlib.Path(sys.argv[1])
plugin = sys.argv[2]
data = {}
if config.exists():
    data = json.loads(config.read_text())
    if not isinstance(data, dict):
        raise SystemExit("opencode.json is not a JSON object")
plugins = data.setdefault("plugins", [])
if not isinstance(plugins, list):
    raise SystemExit("plugins in opencode.json is not an array")
if plugin not in plugins:
    plugins.append(plugin)
config.parent.mkdir(parents=True, exist_ok=True)
config.write_text(json.dumps(data, indent=2) + "\n")
print(f"Added {plugin} to {config}")
PY
elif command -v node >/dev/null 2>&1; then
  node - "$CONFIG" "$PLUGIN_DIR" <<'JS'
const fs = require("node:fs")
const path = require("node:path")
const [configPath, plugin] = process.argv.slice(2)
let data = {}
if (fs.existsSync(configPath)) data = JSON.parse(fs.readFileSync(configPath, "utf8"))
data.plugins = Array.isArray(data.plugins) ? data.plugins : []
if (!data.plugins.includes(plugin)) data.plugins.push(plugin)
fs.mkdirSync(path.dirname(configPath), { recursive: true })
fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + "\n")
console.log(`Added ${plugin} to ${configPath}`)
JS
else
  echo
  echo "Add this path to the plugins array in $CONFIG:"
  echo "  \"$PLUGIN_DIR\""
  echo
fi

echo
echo "Open Settings > Extensions > Plugins and enable MausBot."
echo "Then click + in the Bots fold under Archive."
