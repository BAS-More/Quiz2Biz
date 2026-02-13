#!/usr/bin/env python3
"""
Remove files where first half equals second half (entire file duplicated)
"""
from pathlib import Path


def remove_half_duplicate(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        total = len(lines)
        if total < 4:  # Too small to have meaningful duplicate
            return False, 0

        # Check if file is even length and first half == second half
        if total % 2 == 0:
            mid = total // 2
            first_half = lines[:mid]
            second_half = lines[mid:]

            if first_half == second_half:
                # Keep only first half
                with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                    f.writelines(first_half)
                return True, mid

        # Check if first half matches second half with 1-2 lines offset (for slight misalignment)
        for offset in [0, 1, 2]:
            if total > offset * 2:
                mid = (total - offset) // 2
                first_half = ''.join(lines[:mid])
                second_half = ''.join(lines[mid:mid*2])

                if first_half == second_half:
                    with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                        f.writelines(lines[:mid])
                    return True, total - mid

        return False, 0
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
    print("Removing Half-File Duplicates")
    print("="*60)

    for fp in sorted(ts_files):
        was_fixed, removed = remove_half_duplicate(fp)
        if was_fixed:
            print(f"✓ {fp.name} (-{removed} lines)")
            fixed += 1
            total_removed += removed

    print(f"\n{'='*60}")
    print(f"Fixed: {fixed} files | Removed: {total_removed} lines")
    print("="*60)


if __name__ == "__main__":
    main()
