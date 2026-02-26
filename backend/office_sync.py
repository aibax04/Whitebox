import os
import subprocess
import time
import random
from datetime import datetime

AGENT_DIR = "/Users/psiadmin/clawd/workspace/whitebox-dashboard/backend/agents"
SCRIPTS = [f for f in os.listdir(AGENT_DIR) if f.endswith(".py")]

def run_agent(script_name):
    script_path = os.path.join(AGENT_DIR, script_name)
    try:
        # Run the agent script. They are designed to report to the dashboard and exit.
        subprocess.Popen(["python3", script_path])
        print(f"Executed: {script_name}")
    except Exception as e:
        print(f"Failed to run {script_name}: {e}")

def main():
    print("Whitebox Office Synchronization Active.")
    while True:
        # Randomly pick 1-3 agents to do something
        to_run = random.sample(SCRIPTS, random.randint(1, 3))
        for script in to_run:
            run_agent(script)
        
        # Wait a bit before the next "office activity"
        time.sleep(random.randint(5, 15))

if __name__ == "__main__":
    main()
