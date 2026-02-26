import json
import os

STATUS_PATH = "/Users/psiadmin/clawd/workspace/whitebox-dashboard/public/status.json"

def fix_it():
    try:
        with open(STATUS_PATH, 'r') as f:
            raw = f.read()
        
        # Look for the double closing brace at the very end
        if raw.endswith('}\n}'):
            fixed = raw[:-2]
            with open(STATUS_PATH, 'w') as f:
                f.write(fixed)
            print("SUCCESS: Fixed trailing extra data in status.json")
        elif raw.count('}') > raw.count('{'):
            # More aggressive search for the break point
            fixed = raw.strip()
            while fixed.endswith('}') and fixed.count('}') > fixed.count('{'):
                fixed = fixed[:-1].strip()
            
            # Verify valid JSON
            json.loads(fixed)
            with open(STATUS_PATH, 'w') as f:
                f.write(fixed)
            print("SUCCESS: Repaired JSON structure in status.json")
        else:
            print("INFO: JSON structure appears balanced.")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    fix_it()
