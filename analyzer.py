import os
import re

def analyze_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return []

    # 1. Extract fields with index: true
    # We'll use a regex to find all field definitions and check if they have index: true
    fields_with_index_true = {}
    
    # This regex tries to find the field name and its content block
    # It's simplified but should work for standard Mongoose schema layout
    field_defs = re.finditer(r'([a-zA-Z0-9_]+):\s*{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}', content)
    for match in field_defs:
        field_name = match.group(1)
        block = match.group(0)
        if 'index: true' in block:
            # Find line number
            line_num = content[:match.start()].count('\n') + 1
            # Adjust if index: true is on a different line within the block
            index_line_offset = block.split('\n').index(next(l for l in block.split('\n') if 'index: true' in l))
            fields_with_index_true[field_name] = line_num + index_line_offset

    # 2. Extract single-field .index() calls
    schema_indexes = []
    index_calls = re.finditer(r'\.index\(\s*{\s*([a-zA-Z0-9_"]+):\s*[^,}]+\s*}\s*\)', content)
    for match in index_calls:
        field_name = match.group(1).strip('"')
        line_num = content[:match.start()].count('\n') + 1
        schema_indexes.append((field_name, line_num))

    duplicates = []
    for field_name, index_line in schema_indexes:
        if field_name in fields_with_index_true:
            duplicates.append({
                'field': field_name,
                'schema_line': fields_with_index_true[field_name],
                'index_line': index_line
            })
            
    return duplicates

models_dir = 'src/models/'
found_any = False
for filename in os.listdir(models_dir):
    if filename.endswith('.ts'):
        filepath = os.path.join(models_dir, filename)
        dupes = analyze_file(filepath)
        if dupes:
            found_any = True
            for d in dupes:
                print(f"File: {filename}, Field: {d['field']}, index:true line: {d['schema_line']}, .index() line: {d['index_line']}")

if not found_any:
    print("NO duplicates found.")
