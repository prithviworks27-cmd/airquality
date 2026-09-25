#!/usr/bin/env python3
"""Build a single-file standalone version of AirWatch.

Inlines css/style.css and the js/ ES modules into one HTML file so the app
can be opened directly (or served as a single static file) without a module
server. The multi-file structure in index.html/js/css remains the canonical
source; this is a derived artifact for preview and easy sharing.

Run from anywhere:  python3 air-quality-dashboard/tools/build_standalone.py
Output:             air-quality-dashboard/standalone.html
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "standalone.html"

html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")

# --- Inline the stylesheet ---
html = html.replace(
    '<link rel="stylesheet" href="css/style.css">',
    "<style>\n" + css + "\n</style>",
)

# --- Inline the JS module graph in dependency order ---
MODULE_ORDER = ["config.js", "aqi.js", "airQuality.js", "map.js", "app.js"]

def strip_module_syntax(src: str) -> str:
    # Remove import statements (single-line only, which is all we use).
    src = re.sub(r'^import .*?;\s*$', '', src, flags=re.MULTILINE)
    # Strip the `export ` keyword from declarations.
    src = re.sub(r'^export\s+(?=(const|let|var|function|class|async function))',
                 '', src, flags=re.MULTILINE)
    # Inline simple re-export lines like `export { a, b };` (none currently).
    src = re.sub(r'^export\s*\{[^}]*\};\s*$', '', src, flags=re.MULTILINE)
    return src

js_parts = []
for name in MODULE_ORDER:
    src = (ROOT / "js" / name).read_text(encoding="utf-8")
    js_parts.append(f"// ==== js/{name} ====\n" + strip_module_syntax(src))

inline_js = "\n\n".join(js_parts)
# Sanity check: no leftover import/export statements.
assert "import " not in inline_js.replace("important", ""), "unhandled import left in JS bundle"

html = html.replace(
    '<script type="module" src="js/app.js"></script>',
    "<script>\n" + inline_js + "\n</script>",
)

OUT.write_text(html, encoding="utf-8")
print(f"Wrote {OUT} ({OUT.stat().st_size:,} bytes)")
