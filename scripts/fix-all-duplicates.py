#!/usr/bin/env python3
"""
Comprehensive duplicate remover - finds EXACT content duplication anywhere in file
"""
from pathlib import Path
import hashlib


def find_exact_duplicate_block(lines):
    """Find where exact duplication starts by checking content hashes"""
    if len(lines) < 4:
        return -1

    # Try different split points
    for split_point in range(2, len(lines) - 2):
        first_part = ''.join(lines[:split_point])
        remaining = ''.join(lines[split_point:])

        # Check if remaining starts with a duplicate of first part
        if remaining.startswith(first_part):
            return split_point

    return -1


def remove_duplicates_comprehensive(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        lines = content.split('\n')
        duplicate_start = find_exact_duplicate_block(lines)

        if duplicate_start > 0:
            cleaned_lines = lines[:duplicate_start]
            while cleaned_lines and not cleaned_lines[-1].strip():
                cleaned_lines.pop()

            with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                f.write('\n'.join(cleaned_lines) + '\n')

            return True, len(lines) - len(cleaned_lines)
        return False, 0
    except Exception as e:
        return False, 0


def main():
    dirs = [Path("apps/api/src"), Path("libs")]
    ts_files = []
    for source_dir in dirs:
        if source_dir.exists():
            ts_files.extend([f for f in source_dir.rglob(
                "*.ts") if '.spec.' not in f.name and '.d.' not in f.name])

    fixed = 0
    total_removed = 0

    print("="*60)
    print("COMPREHENSIVE Duplicate Removal")
    print("="*60)

    for fp in sorted(ts_files):
        was_fixed, removed = remove_duplicates_comprehensive(fp)
        if was_fixed:
            print(f"✓ {fp.name} (-{removed} lines)")
            fixed += 1
            total_removed += removed

    print(f"\n{'='*60}")
    print(f"Fixed: {fixed} files | Removed: {total_removed} lines")
    print("="*60)


if __name__ == "__main__":
    main()
