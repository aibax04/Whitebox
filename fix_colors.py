import os
import re

def to_red(file_path):
    with open(file_path, "r") as f:
        content = f.read()

    # In CSS and HTML, convert common non-red hex colors to red/dark red
    # cyan/green mostly #00ff88 or #00cc6a
    content = re.sub(r'#00ff88', '#ff0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#00cc6a', '#cc0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#00ccff', '#ff0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#0099cc', '#cc0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#0088ff', '#ff0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#0066cc', '#cc0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#aa66ff', '#ff0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#7733cc', '#cc0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#ffaa00', '#ff0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#cc8800', '#cc0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#ffcc00', '#ff0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#cc9900', '#cc0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#66ffcc', '#ff0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#44cc99', '#cc0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#ff66cc', '#ff0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#cc4499', '#cc0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#00ff88', '#ff0000', content, flags=re.IGNORECASE)
    content = re.sub(r'#00cc6a', '#cc0000', content, flags=re.IGNORECASE)
    
    # In rgba, 0, 255, 136 -> 255, 0, 0
    content = re.sub(r'rgba\(0,\s*255,\s*136,', 'rgba(255, 0, 0,', content)
    content = re.sub(r'rgba\(0,\s*136,\s*255,', 'rgba(255, 0, 0,', content)
    content = re.sub(r'rgba\(170,\s*102,\s*255,', 'rgba(255, 0, 0,', content)
    content = re.sub(r'rgba\(255,\s*170,\s*0,', 'rgba(255, 0, 0,', content)
    content = re.sub(r'rgba\(0,\s*204,\s*255,', 'rgba(255, 0, 0,', content)
    content = re.sub(r'rgba\(255,\s*102,\s*204,', 'rgba(255, 0, 0,', content)
    content = re.sub(r'rgba\(102,\s*255,\s*204,', 'rgba(255, 0, 0,', content)
    content = re.sub(r'rgba\(255,\s*204,\s*0,', 'rgba(255, 0, 0,', content)

    # In styles.css, let's fix the :root variables again just to be safe
    # Also change the logo color if it uses a filter, or just make it greyscale
    if "styles.css" in file_path or "home.css" in file_path:
        content = content.replace("var(--active)", "var(--ready)")
        content = content.replace("var(--purple)", "var(--ready)")
        content = content.replace("var(--warning)", "var(--ready)")
        content = content.replace("var(--danger)", "var(--ready)")
        content = content.replace("var(--success)", "var(--ready)")
        
    with open(file_path, "w") as f:
        f.write(content)

for root, _, files in os.walk("frontend"):
    for file in files:
        if file.endswith(".html") or file.endswith(".css") or file.endswith(".js"):
            to_red(os.path.join(root, file))
