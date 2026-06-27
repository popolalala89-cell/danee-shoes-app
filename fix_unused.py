import re

# Fix Orders.tsx
with open('src/pages/Orders.tsx', 'r') as f:
    content = f.read()

# 1. L345: Remove unused _subtotal line
content = content.replace(
    "const _subtotal = items.reduce((s, i) => s + i.hargaSatuan * i.qty, 0);\n    const diskonNominal = extractDiskonNominal(o.diskon_info || '');\n    const total = o.harga ?? 0;",
    "const diskonNominal = extractDiskonNominal(o.diskon_info || '');\n    const total = o.harga ?? 0;"
)

# 2. L637: Remove _result assignment
# First occurrence
idx1 = content.find("const _result = await Share.share({")
idx2 = content.find("const _result = await Share.share({", idx1 + 1)
if idx1 >= 0:
    content = content[:idx1] + "await Share.share({" + content[idx1 + len("const _result = await Share.share({"):]
if idx2 >= 0:
    content = content[:idx2] + "await Share.share({" + content[idx2 + len("const _result = await Share.share({"):]

# 3. L1188: Fix _subtotal back to subtotal (it IS used)
content = content.replace(
    "const _subtotal = items.reduce((s, i) => s + i.hargaSatuan * i.qty, 0);\n                    const diskonNominal = extractDiskonNominal(cetakStruk.diskon_info || '');\n                    const _total = cetakStruk.harga ?? 0;",
    "const subtotal = items.reduce((s, i) => s + i.hargaSatuan * i.qty, 0);\n                    const diskonNominal = extractDiskonNominal(cetakStruk.diskon_info || '');\n                    const total = cetakStruk.harga ?? 0;"
)

# 4. L1279: Remove unused _subtotal
content = content.replace(
    "const _subtotal = items.reduce((s, i) => s + i.hargaSatuan * i.qty, 0);\n                const diskonNominal = extractDiskonNominal(cetakStruk.diskon_info || '');\n                // Hitung total hemat",
    "const diskonNominal = extractDiskonNominal(cetakStruk.diskon_info || '');\n                // Hitung total hemat"
)

with open('src/pages/Orders.tsx', 'w') as f:
    f.write(content)

print("Orders.tsx fixed")

# Fix ProfitSharing.tsx
with open('src/pages/ProfitSharing.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const _totalSelisih = Math.abs(ao.gross - ao.alokasiHPP - ao.komisi - ao.nett);\n",
    ""
)

with open('src/pages/ProfitSharing.tsx', 'w') as f:
    f.write(content)

print("ProfitSharing.tsx fixed")

# Fix Ringkasan.tsx
with open('src/pages/Ringkasan.tsx', 'r') as f:
    content = f.read()

content = content.replace("const _navigate = useNavigate();\n", "")
# Remove useNavigate import if it's only used here
content = content.replace("import { useNavigate } from 'react-router-dom';\n", "")
content = content.replace(", useNavigate }", " }")
content = content.replace("useNavigate, ", "")

with open('src/pages/Ringkasan.tsx', 'w') as f:
    f.write(content)

print("Ringkasan.tsx fixed")
print("All done")
