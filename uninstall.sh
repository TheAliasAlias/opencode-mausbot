#!/usr/bin/env sh
# Remove MausBot from the global OpenCode config and delete its plugin files.
# Bot sessions and memory files are not touched.
set -eu

CONFIG_DIR=${OPENCODE_CONFIG_DIR:-"$HOME/.config/opencode"}
PLUGIN_DIR="$CONFIG_DIR/plugins/opencode-mausbot"
CONFIG="$CONFIG_DIR/opencode.json"

if [ -f "$CONFIG" ]; then
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$CONFIG" "$PLUGIN_DIR" <<'PY'
import json
import pathlib
import sys

config = pathlib.Path(sys.argv[1])
plugin = sys.argv[2]
try:
    data = json.loads(config.read_text())
except Exception as error:
    raise SystemExit(f"Could not read {config}: {error}. Remove the plugin path by hand.")
plugins = data.get("plugins")
if isinstance(plugins, list):
    data["plugins"] = [entry for entry in plugins if entry != plugin]
    config.write_text(json.dumps(data, indent=2) + "\n")
    print(f"Removed {plugin} from {config}")
PY
  elif command -v node >/dev/null 2>&1; then
    node - "$CONFIG" "$PLUGIN_DIR" <<'JS'
const fs = require("node:fs")
const [configPath, plugin] = process.argv.slice(2)
const data = JSON.parse(fs.readFileSync(configPath, "utf8"))
if (Array.isArray(data.plugins)) data.plugins = data.plugins.filter((entry) => entry !== plugin)
fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + "\n")
console.log(`Removed ${plugin} from ${configPath}`)
JS
  else
    echo "Remove this path from the plugins array in $CONFIG:"
    echo "  \"$PLUGIN_DIR\""
  fi
fi

if [ -d "$PLUGIN_DIR" ]; then
  rm -rf "$PLUGIN_DIR"
  echo "Deleted $PLUGIN_DIR"
fi

echo "MausBot removed. Bot sessions and memory files were left alone."
