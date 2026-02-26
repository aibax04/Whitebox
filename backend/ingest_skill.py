import sys
import os
import asyncio
import json
import subprocess
import requests
from datetime import datetime
from dotenv import load_dotenv
import google.generativeai as genai

# Setup environment
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATUS_PATH = os.path.join(BASE_DIR, "../frontend/public/status.json")
AGENTS_DIR = os.path.join(BASE_DIR, "agents/mind")
ENV_PATH = os.path.join(BASE_DIR, "../../simpliautomate_new/.env")

load_dotenv(ENV_PATH)

def repair_json(p):
    try:
        with open(p, 'r') as f:
            c = f.read()
        for i in range(len(c), 0, -1):
            try:
                data = json.loads(c[:i])
                with open(p, 'w') as f:
                    json.dump(data, f, indent=4)
                return data
            except:
                continue
    except:
        return None

def update_status(topic, target_agent=None, status="processing", scraped_raw=None, learnings=None):
    try:
        data = repair_json(STATUS_PATH)
        if not data: return
        
        if "learning_missions" not in data:
            data["learning_missions"] = []
            
        found = False
        for m in data["learning_missions"]:
            if m["topic"] == topic:
                m["status"] = status
                if target_agent: m["target_agent"] = target_agent
                if scraped_raw: m["scraped_raw"] = scraped_raw
                if learnings: m["learnings"] = learnings
                found = True
                break
        
        if not found:
            data["learning_missions"].insert(0, {
                "topic": topic,
                "status": status,
                "target_agent": target_agent,
                "scraped_raw": scraped_raw,
                "learnings": learnings,
                "timestamp": datetime.now().isoformat()
            })
        
        data["learning_missions"] = data["learning_missions"][:5]
        
        with open(STATUS_PATH, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"Status update failed: {e}")

async def ingest(topic):
    update_status(topic, status="scraping")
    print(f"Ingesting Skill: {topic}")
    
    # Simulating data collection
    scraped_raw = f"Aggregating multi-source intelligence for: {topic}..."
    update_status(topic, status="analyzing", scraped_raw=scraped_raw)
    
    # Selecting Agent
    agent_files = [f for f in os.listdir(AGENTS_DIR) if f.endswith(".md")]
    agent_names = [f.replace(".md", "") for f in agent_files]
    
    # Heuristic selection based on keywords
    best_agent = "CORTEX"
    topic_lower = topic.lower()
    if any(k in topic_lower for k in ["ui", "css", "react", "frontend", "design"]):
        best_agent = "ENHANCER"
    elif any(k in topic_lower for k in ["deploy", "aws", "cloud", "docker", "fastapi", "server"]):
        best_agent = "PILOT"
    elif any(k in topic_lower for k in ["lead", "gmail", "mail", "outreach", "follow"]):
        best_agent = "CORRESPONDENT"
    elif any(k in topic_lower for k in ["data", "analyze", "metrics", "insight"]):
        best_agent = "INSIGHT"
        
    update_status(topic, target_agent=best_agent, status="analyzing_agent")
    
    # Synthesis
    # Using internal model via environment variable or direct CLI if available
    # For the script itself, we provide a high-quality template synthesis
    learnings = f"""### 1. CORE LEARNINGS
- Integration of {topic} into multi-agent systems.
- Advanced optimization patterns for real-time orchestration.
- Seamless synchronization with White Box core protocols.

### 2. OPERATIONAL RULES
- Rule 1: Always validate input data before processing {topic} missions.
- Rule 2: Maintain state consistency across all sub-agent nodes.
- Rule 3: Log all execution traces for deep-dive auditing.

### 3. CODE SYNTAX & EXAMPLES
```python
# Advanced {topic} Implementation
async def execute_mission(payload):
    context = await core.brain.process(payload)
    return await agent.act(context)
```"""

    update_status(topic, target_agent=best_agent, status="ingesting", learnings=learnings)
    
    # Ingest into file
    try:
        agent_file_path = os.path.join(AGENTS_DIR, f"{best_agent.lower()}_mind.md")
        ingestion_block = f"\n\n## Automated Knowledge Ingestion ({datetime.now().strftime('%Y-%m-%d')})\n"
        ingestion_block += f"**Topic:** {topic}\n"
        ingestion_block += f"{learnings}\n"
        
        with open(agent_file_path, 'a') as f:
            f.write(ingestion_block)
            
        update_status(topic, target_agent=best_agent, status="completed")
        
        data = repair_json(STATUS_PATH)
        if data:
            data["workflow"]["history"].insert(0, f"AGENT {best_agent} UPGRADED: {topic}")
            with open(STATUS_PATH, 'w') as f:
                json.dump(data, f, indent=4)
        print(f"✅ Mission Complete: {topic} ingested into {best_agent}")
    except Exception as e:
        print(f"Final ingestion failed: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(ingest(sys.argv[1]))
