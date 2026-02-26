import sys
import os

# CORE PATH: Add backend/agents to path so we can import 'core.py'
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.append(CURRENT_DIR)

from core import Agent # Imports the robust base class

class WhiteBox(Agent):
    def __init__(self):
        super().__init__("White Box", "Coordinator")
    
    def execute_mission(self, mission_id, payload):
        """Executes a specific mission logic."""
        self.log(f"Starting mission {mission_id}: {payload['title']}")
        # Example: Use self.think() for complex processing
        thought = self.think(f"Given mission {mission_id}, analyze: {payload}")
        self.log(f"Cognitive Output: {thought[:100]}...")
        return thought

if __name__ == "__main__":
    agent = WhiteBox()
    print(f"✅ {agent.name} ({agent.role}) is STRONG & ONLINE.")
    agent.run()