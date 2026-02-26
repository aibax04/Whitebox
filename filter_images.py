import re

def add_filter(css_path):
    with open(css_path, "r") as f:
        content = f.read()

    # If already added, do nothing
    if "filter: grayscale" in content:
        return
    
    # Add filter to img elements globally or specifically
    rule = "\nimg {\n    filter: grayscale(100%) sepia(100%) hue-rotate(330deg) saturate(300%) contrast(1.2) brightness(0.6);\n}\n"
    content += rule

    with open(css_path, "w") as f:
        f.write(content)

add_filter("frontend/static/styles.css")
add_filter("frontend/static/home.css")

