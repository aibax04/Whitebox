import os
import re

def process_styles():
    path = "frontend/static/styles.css"
    with open(path, "r") as f:
        content = f.read()

    # Replace :root block completely
    root_match = re.search(r':root\s*\{[^}]*\}', content)
    if root_match:
        new_root = """:root {
    --bg: #000000;
    --bg-gradient: #000000;
    --surface: #0a0a0a;
    --surface-solid: #0f0f0f;
    --surface-accent: #141414;
    --surface-hover: #1a1a1a;
    --surface-glass: rgba(10, 10, 10, 0.8);
    --text: #ffffff;
    --text-muted: #aaaaaa;
    --text-dim: #777777;
    --accent: #ff0000;
    --border: #333333;
    --border-hover: #555555;
    --border-glow: transparent;
    --font-main: 'Inter', -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
    --ready: #e60000;
    --ready-dim: #cc0000;
    --ready-glow: rgba(230, 0, 0, 0.2);
    --ready-bg: rgba(230, 0, 0, 0.1);
    --idle: #444444;
    --active: #ff3333;
    --active-dim: #cc0000;
    --active-glow: rgba(255, 51, 51, 0.2);
    --active-bg: rgba(255, 51, 51, 0.1);
    --warning: #ff4444;
    --warning-bg: rgba(255, 68, 68, 0.1);
    --danger: #ff0000;
    --danger-bg: rgba(255, 0, 0, 0.1);
    --success: #e60000;
    --purple: #ff0000;
    --purple-glow: rgba(255, 0, 0, 0.2);
    --shadow-sm: 0 2px 12px rgba(0, 0, 0, 0.6);
    --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.8);
    --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.9);
    --shadow-glow: none;
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --transition-fast: 0.15s ease;
    --transition-base: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-smooth: 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}"""
        content = content.replace(root_match.group(0), new_root)
    
    # Remove body::before and body gradients
    content = re.sub(r'body::before\s*\{[^}]*\}', 'body::before {\n    display: none;\n}', content)
    
    # Change box shadows that are green/cyan
    content = re.sub(r'rgba\(0,\s*255,\s*136,\s*0\.\d+\)', 'rgba(255, 0, 0, 0.2)', content)
    content = re.sub(r'rgba\(0,\s*136,\s*255,\s*0\.\d+\)', 'rgba(255, 0, 0, 0.2)', content)
    
    # Change linear gradients
    content = re.sub(r'linear-gradient\([^)]*\)', 'var(--bg)', content) # simplistic, but wait, maybe I shouldn't replace ALL linear gradients.
    
    with open(path, "w") as f:
        f.write(content)

def process_home_css():
    path = "frontend/static/home.css"
    with open(path, "r") as f:
        content = f.read()

    root_match = re.search(r':root\s*\{[^}]*\}', content)
    if root_match:
        new_root = """:root {
    --bg: #000000;
    --surface: #0a0a0a;
    --surface-solid: #0f0f0f;
    --text: #ffffff;
    --text-muted: #aaaaaa;
    --text-dim: #777777;
    --border: #333333;
    --border-hover: #555555;
    --ready: #e60000;
    --ready-dim: #cc0000;
    --ready-glow: rgba(230, 0, 0, 0.2);
    --ready-bg: rgba(230, 0, 0, 0.1);
    --active: #ff3333;
    --active-glow: rgba(255, 51, 51, 0.2);
    --purple: #ff0000;
    --purple-glow: rgba(255, 0, 0, 0.2);
    --warning: #ff4444;
    --danger: #ff0000;
    --font-main: 'Inter', -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --radius: 8px;
    --max-w: 1200px;
}"""
        content = content.replace(root_match.group(0), new_root)

    content = re.sub(r'\.hero::before\s*\{[^}]*\}', '.hero::before {\n    display: none;\n}', content)
    content = re.sub(r'\.hero::after\s*\{[^}]*\}', '.hero::after {\n    display: none;\n}', content)
    content = re.sub(r'\.hero-glow\s*\{[^}]*\}', '.hero-glow {\n    display: none;\n}', content)
    
    # Replace explicit colored rgba
    content = re.sub(r'rgba\(0,\s*255,\s*136,\s*0\.\d+\)', 'rgba(255, 0, 0, 0.1)', content)
    content = re.sub(r'rgba\(0,\s*136,\s*255,\s*0\.\d+\)', 'rgba(255, 0, 0, 0.1)', content)

    with open(path, "w") as f:
        f.write(content)

def process_htmls():
    paths = ["frontend/index.html", "frontend/home.html"]
    for p in paths:
        with open(p, "r") as f:
            c = f.read()

        # In index.html, remove cyber mode toggle inside Sidebar
        c = re.sub(r'<div class="nav-item" onclick="toggleNeon\(\)".*?Cyber Mode: ON\s*</div>', '', c, flags=re.DOTALL)
        
        # In index.html, AGENT_COLORS dictionary values to red shades
        c = re.sub(r"(bg:\s*)'[^']+'(.*?)border:\s*'[^']+'(.*?)text:\s*'[^']+'", r"\1'rgba(255,0,0,0.1)'\2border: 'rgba(255,0,0,0.3)'\3text: '#ff0000'", c)
        
        # Replace inline gradients on agent cards
        c = re.sub(r'background:linear-gradient\(90deg,[^)]+\)', 'background:#e60000', c)
        
        # Remove pulsing aurabar
        c = re.sub(r'<div id="aura-vibe" class="aura-vibe">RESONATING...</div>', '', c)
        c = re.sub(r'<div class="aura-bar"></div>', '<div class="aura-bar" style="background:#ff0000;"></div>', c)

        # change specific colors in home.html like green/blue/purple
        c = c.replace('class="feature-icon green"', 'class="feature-icon"')
        c = c.replace('class="feature-icon blue"', 'class="feature-icon"')
        c = c.replace('class="feature-icon purple"', 'class="feature-icon"')
        c = c.replace('class="feature-icon amber"', 'class="feature-icon"')
        c = c.replace('class="feature-icon pink"', 'class="feature-icon"')
        c = c.replace('class="feature-icon cyan"', 'class="feature-icon"')

        # remove specific styling on agent icons in home.html
        c = re.sub(r'style="background: rgba[^"]+; color: #[^"]+"', 'style="background: rgba(255,0,0,0.1); color: #ff0000;"', c)

        with open(p, "w") as f:
            f.write(c)

process_styles()
process_home_css()
process_htmls()
print("Refactoring done.")
