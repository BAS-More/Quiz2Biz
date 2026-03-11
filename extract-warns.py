import re
with open('ci-lint-full.txt', 'rb') as f:
    content = f.read().decode('utf-8', errors='replace')

# Find all [warn] lines with file paths
pattern = r'\[warn\]\s*((?:apps|libs)/\S+)'
matches = re.findall(pattern, content)
for m in matches:
    print(m)
print(f"\nTotal: {len(matches)} files")
