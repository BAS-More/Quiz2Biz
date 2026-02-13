#!/usr/bin/env python3
"""
Duplicate Code Remover - Detects duplicate class/interface declarations
"""
import re
from pathlib import Path


def find_duplicate_by_class(content):
    """Find duplicates by detecting repeated class/interface declarations"""
    lines = content.split('\n')
    declarations = []
    for i, line in enumerate(lines):
        if re.match(r'^export (class|interface|enum|const|type)', line.strip()):
            declarations.append((i, line.strip()))

    seen = {}
    for line_num, decl in declarations:
        match = re.match(r'export (class|interface|enum) (\w+)', decl)
        if match:
            name = match.group(2)
            if name in seen:
                # Find imports before duplicate
                for j in range(line_num - 1, max(0, line_num - 20), -1):
                    if lines[j].strip().startswith('import '):
                        return j
                return line_num
            seen[name] = line_num
    return -1


def remove_duplicates(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        duplicate_start = find_duplicate_by_class(content)

        if duplicate_start > 0:
            lines = content.split('\n')
            cleaned_lines = lines[:duplicate_start]
            while cleaned_lines and not cleaned_lines[-1].strip():
                cleaned_lines.pop()

            cleaned_content = '\n'.join(cleaned_lines) + '\n'
            with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(cleaned_content)

            return True, len(lines) - len(cleaned_lines)
        return False, 0
    except Exception as e:
        print(f"Error: {file_path}: {e}")
        return False, 0


def main():
    print("="*60)
    print("Fixing Duplicate Code - ALL LIBS")
    print("="*60)

    # Scan both apps and libs directories
    dirs = [Path("apps/api/src"), Path("libs")]
    ts_files = []
    for source_dir in dirs:
        if source_dir.exists():
            ts_files.extend([f for f in source_dir.rglob(
                "*.ts") if '.spec.' not in f.name and '.d.' not in f.name])

    fixed = 0
    total_removed = 0

    for fp in sorted(ts_files):
        was_fixed, removed = remove_duplicates(fp)
        if was_fixed:
            print(f"✓ {fp.name} (-{removed} lines)")
            fixed += 1
            total_removed += removed

    print(f"\n{'='*60}")
    print(
        f"Scanned: {len(ts_files)} | Fixed: {fixed} | Removed: {total_removed} lines")
    print("="*60)
    return fixed


if __name__ == "__main__":
    main()
