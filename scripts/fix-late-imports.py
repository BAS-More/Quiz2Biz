#!/usr/bin/env python3
"""
Remove duplicate imports that appear after the main code body
"""
from pathlib import Path
import re


def remove_late_imports(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        lines = content.split('\n')

        # Find LAST export class/interface closing brace
        last_closing_brace = -1
        for i in range(len(lines) - 1, -1, -1):
            stripped = lines[i].strip()
            if stripped == '}' or stripped.startswith('}'):
                # This might be the last closing brace
                last_closing_brace = i
                break

        if last_closing_brace == -1:
            return False, 0

        # Check if there are import statements AFTER this closing brace
        suspicious_import = -1
        for i in range(last_closing_brace + 1, len(lines)):
            stripped = lines[i].strip()
            if stripped.startswith('import ') and ' from ' in stripped:
                suspicious_import = i
                break

        if suspicious_import == -1:
            return False, 0

        # Remove from suspicious import onwards
        cleaned_lines = lines[:suspicious_import]

        # Remove trailing empty lines
        while cleaned_lines and not cleaned_lines[-1].strip():
            cleaned_lines.pop()

        # Write back
        cleaned_content = '\n'.join(cleaned_lines) + '\n'
        with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(cleaned_content)

        return True, len(lines) - len(cleaned_lines)

    except Exception as e:
        return False, 0


def main():
    # Scan both apps and libs directories
    dirs = [Path("apps/api/src"), Path("libs")]
    ts_files = []
    for source_dir in dirs:
        if source_dir.exists():
            ts_files.extend([f for f in source_dir.rglob(
                "*.ts") if '.spec.' not in f.name and '.d.' not in f.name])

    fixed = 0
    total_removed = 0

    print("="*60)
    print("Removing Late Duplicate Imports")
    print("="*60)

    for fp in sorted(ts_files):
        was_fixed, removed = remove_late_imports(fp)
        if was_fixed:
            print(f"✓ {fp.name} (-{removed} lines)")
            fixed += 1
            total_removed += removed

    print(f"\n{'='*60}")
    print(f"Fixed: {fixed} files | Removed: {total_removed} lines")
    print("="*60)


if __name__ == "__main__":
    main()
