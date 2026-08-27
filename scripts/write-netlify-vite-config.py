#!/usr/bin/env python3
"""Generate vite.config.netlify.ts from static config with base / for Netlify root."""
from pathlib import Path

src = Path("vite.config.static.ts").read_text()
netlify = src.replace('const BASE = "/myafriartx/";', 'const BASE = "/";')
netlify = netlify.replace("basepath: BASE", 'basepath: "/"')
Path("vite.config.netlify.ts").write_text(netlify)
print("wrote vite.config.netlify.ts (base /)")
