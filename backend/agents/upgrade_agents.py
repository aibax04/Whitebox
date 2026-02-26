
import os
import sys

# Agent configurations from original setup
AGENTS = {
    "White Box": "Coordinator",
    "Cortex": "Brain",
    "COUNCIL": "Meeting Sentry",
    "Pilot": "Implementation",
    "Correspondent": "Ghostwriter",
    "Strategist": "Market Intel",
    "Auditor": "Integrity & QA",
    "Enhancer": "UX/UI Design",
    "Insight": "Data Analyst",
    "Promoter": "Social Media"
}

BACKEND_AGENTS_DIR = os.path.dirname(os.path.abspath(__file__))

# Template for strong agent file
TEMPLATE = """
import sys
import os

# CORE PATH: Add backend/agents to path so we can import 'core.py'
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

from core import Agent # Imports the robust base class

class {class_name}(Agent):
    def __init__(self):
        super().__init__("{agent_name}", "{agent_role}")
    
    def execute_mission(self, mission_id, payload):
        \"\"\"Executes a specific mission logic.\"\"\"
        self.log(f"Starting mission {{mission_id}}: {{payload['title']}}")
        # Example: Use self.think() for complex processing
        thought = self.think(f"Given mission {{mission_id}}, analyze: {{payload}}")
        self.log(f"Cognitive Output: {{thought[:100]}}...")
        return thought

if __name__ == "__main__":
    agent = {class_name}()
    print(f"✅ {{agent.name}} ({{agent.role}}) is STRONG & ONLINE.")
    agent.run()
"""

def upgrade_agents():
    print("🚀 Upgrading Agent Modules with Backend Strength...")
    
    for name, role in AGENTS.items():
        class_name = name.replace(" ", "").replace("-", "")
        # Filename logic: lowercase, spaces -> underscore? Or just name.lower() as per diffs
        # The user seems to have 'whitebox.py', 'cortex.py', 'council.py', etc.
        # Let's check listing from previous turn to be sure.
        # Step 221: 'whitebox.py', 'cortex.py', 'council.py', 'pilot.py', 'correspondent.py', 'strategist.py', 'auditor.py', 'enhancer.py', 'insight.py', 'promoter.py'
        
        # Consistent mapping:
        filename = name.lower().replace(" ", "") + ".py"
        
        file_path = os.path.join(BACKEND_AGENTS_DIR, filename)
        
        content = TEMPLATE.format(class_name=class_name, agent_name=name, agent_role=role)
        
        with open(file_path, 'w') as f:
            f.write(content.strip())
            
        print(f"✅ Strongified: {filename}")

if __name__ == "__main__":
    upgrade_agents()
