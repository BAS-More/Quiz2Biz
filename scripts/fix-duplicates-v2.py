#!/usr/bin/env python3
"""
Remove orphaned duplicate imports after class definitions
"""
from pathlib import Path


def remove_trailing_imports(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # Find last root-level closing brace
        last_root_brace = -1
        indent_level = 0

        for i, line in enumerate(lines):
            stripped = line.lstrip()
            if stripped.startswith('//') or not stripped:
                continue

            # Count braces to track nesting
            open_braces = line.count('{')
            close_braces = line.count('}')
            indent_level += open_braces - close_braces

            # If we hit root level (indent 0) with a closing brace, mark it
            if indent_level == 0 and '}' in line:
                last_root_brace = i

        if last_root_brace == -1:
            return False, 0

        # Check if there are import statements after the last brace
        has_trailing_imports = False
        for i in range(last_root_brace + 1, len(lines)):
            stripped = lines[i].strip()
            if stripped.startswith('import ') or (stripped.startswith('export ') and ' from ' in stripped):
                has_trailing_imports = True
                break

        if not has_trailing_imports:
            return False, 0

        # Remove everything after the last root brace
        cleaned_lines = lines[:last_root_brace + 1]

        # Remove trailing empty lines
        while cleaned_lines and not cleaned_lines[-1].strip():
            cleaned_lines.pop()

        # Write back
        with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
            f.writelines(cleaned_lines)
            f.write('\n')

        return True, len(lines) - len(cleaned_lines)

    except Exception as e:
        print(f"Error: {e}")
        return False, 0


def main():
    source_dir = Path("apps/api/src")
    ts_files = [f for f in source_dir.rglob(
        "*.ts") if '.spec.' not in f.name and '.d.' not in f.name]

    fixed = 0
    total_removed = 0

    print("="*60)
    print("Removing Trailing Duplicate Imports")
    print("="*60)

    for fp in sorted(ts_files):
        was_fixed, removed = remove_trailing_imports(fp)
        if was_fixed:
            print(f"✓ {fp.name} (-{removed} lines)")
            fixed += 1
            total_removed += removed

    print(f"\n{'='*60}")
    print(f"Fixed: {fixed} files | Removed: {total_removed} lines")
    print("="*60)


if __name__ == "__main__":
    main()
