import os
import re

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static", "js"))

exports = {}
imports = {}

# 1. Collect exports
for root, _, files in os.walk(base_dir):
    for f in files:
        if not f.endswith(".js"):
            continue
        filepath = os.path.join(root, f)
        relpath = os.path.relpath(filepath, base_dir).replace("\\", "/")
        with open(filepath, "r", encoding="utf-8") as file:
            content = file.read()

        file_exports = set()
        # Find export const/let/var x = ...
        for m in re.finditer(r"export\s+(?:const|let|var)\s+([a-zA-Z0-9_]+)", content):
            file_exports.add(m.group(1))
        # Find export (async )?function x(...)
        for m in re.finditer(r"export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)", content):
            file_exports.add(m.group(1))
        # Find export default
        if "export default" in content:
            file_exports.add("default")

        exports[relpath] = file_exports

print("--- EXPORTS COLLECTED ---")
for k, v in sorted(exports.items()):
    print(f"  {k}: {sorted(list(v))}")

# 2. Check imports
print("\n--- CHECKING IMPORTS ---")
errors = []
for root, _, files in os.walk(base_dir):
    for f in files:
        if not f.endswith(".js"):
            continue
        filepath = os.path.join(root, f)
        relpath = os.path.relpath(filepath, base_dir).replace("\\", "/")
        with open(filepath, "r", encoding="utf-8") as file:
            content = file.read()

        # Find import { a, b, c } from 'path'
        for m in re.finditer(r"import\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]", content):
            symbols = [s.strip().split(" as ")[0].strip() for s in m.group(1).split(",") if s.strip()]
            import_path = m.group(2)
            
            # Resolve relative import path
            cur_dir = os.path.dirname(filepath)
            target_path = os.path.normpath(os.path.join(cur_dir, import_path)).replace("\\", "/")
            target_rel = os.path.relpath(target_path, base_dir).replace("\\", "/")
            if not target_rel.endswith(".js"):
                target_rel += ".js"

            if target_rel not in exports:
                errors.append(f"In {relpath}: Imported file '{import_path}' (resolved: {target_rel}) not found!")
            else:
                for sym in symbols:
                    if sym not in exports[target_rel]:
                        errors.append(f"In {relpath}: Symbol '{sym}' is not exported by '{target_rel}'! Available: {exports[target_rel]}")

if errors:
    print("\n[ERROR] IMPORT ERRORS DETECTED:")
    for err in errors:
        print("  - " + err)
else:
    print("\n[SUCCESS] ALL MODULE IMPORTS AND EXPORTS RESOLVE PERFECTLY!")
