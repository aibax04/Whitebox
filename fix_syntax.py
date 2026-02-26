import re

def fix_css(file_path):
    with open(file_path, "r") as f:
        content = f.read()

    # The bad replacements left behind things like:
    # background: var(--bg), var(--ready), var(--ready));
    # background: var(--bg) 0%, #a0a0b0 100%);
    content = re.sub(r'var\(--bg\), var\([^)]+\), var\([^)]+\)\);', 'var(--ready);', content)
    content = re.sub(r'var\(--bg\)[^;]+;', 'var(--bg);', content)
    
    # We can be more aggressive to fix the lint errors on specific lines.
    # From IDE feedback:
    # line 208, 497, 736, 762, 773, 815, 885, 894, 915, 1022, 1277
    
    # Actually, the simplest fix is to just restore the files from git or undo, but we didn't stash them.
    # Instead let's just replace all `background: var(--bg)...;` that are broken.
    
    lines = content.split('\n')
    for i in range(len(lines)):
        if "background: var(--bg)" in lines[i] and ");" in lines[i] and "linear-gradient" not in lines[i] and "radial-gradient" not in lines[i]:
            lines[i] = "    background: var(--bg);"
            
    content = '\n'.join(lines)
    
    # Specific bad lines:
    # background: var(--bg) 0%, #a0a0b0 100%);
    content = content.replace("background: var(--bg), var(--ready), var(--ready));", "background: var(--ready);")
    content = content.replace("background: var(--bg) 0%, var(--border-hover), transparent);", "background: var(--ready);")
    content = content.replace("background: var(--bg) 0%, transparent 60%);", "background: var(--bg);")
    content = content.replace("background: var(--bg) 0%, transparent 50%);", "background: var(--bg);")
    content = content.replace("background: var(--bg) 0%, rgba(6, 6, 11, 0.4) 50%, rgba(6, 6, 11, 0.7) 100%);", "background: var(--bg);")
    content = content.replace("background: var(--bg) 0%, rgba(0, 255, 136, 0.04) 0%, transparent 60%);", "background: transparent;")
    content = content.replace("background: var(--bg) 0%, transparent 100%);", "background: transparent;")
    content = content.replace("background: var(--bg) 0%, rgba(255, 0, 0, 0.1) 50%, var(--bg) 100%);", "background: var(--bg);")

    with open(file_path, "w") as f:
        f.write(content)

fix_css("frontend/static/styles.css")
fix_css("frontend/static/home.css")

