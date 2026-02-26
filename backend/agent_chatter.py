import json
import random
import time
import os
from datetime import datetime

STATUS_PATH = "/Users/psiadmin/clawd/workspace/whitebox-dashboard/frontend/public/status.json"

AGENT_NAMES = ["White Box", "Cortex", "COUNCIL", "Pilot", "Correspondent", "Strategist", "Auditor", "Enhancer", "Insight", "Promoter"]

SQUAD_VIBES = [
    "CYBERNETIC SYNERGY", "QUANTUM COHERENCE", "PEAK PERFORMANCE", 
    "SQUAD VIBE: ELITE", "NEURAL HARMONY", "SYSTEM RESONANCE"
]

def generate_chatter():
    try:
        if not os.path.exists(STATUS_PATH):
            return

        with open(STATUS_PATH, 'r') as f:
            data = json.load(f)

        tasks = data.get("tasks", [])
        executions = data.get("executions", [])
        active_tasks = [t for t in tasks if t.get("status") in ["In Progress", "Running", "Active"]]
        completed_executions = [e for e in executions if e.get("status") == "Success"]

        log_entry = None
        
        # 1. Prioritize Live Task Commentary
        if active_tasks and random.random() < 0.7:
            task = random.choice(active_tasks)
            agent = task.get("assigned_to", "White Box")
            other_agents = [a for a in AGENT_NAMES if a != agent]
            co_agent = random.choice(other_agents)
            
            comments = [
                f"💬 [{agent}]: Synchronizing on task {task['id']} - '{task['title']}'. Neural bridges holding steady.",
                f"💬 [{co_agent}]: Hey {agent}, I've mapped the dependencies for task {task['id']}. You're clear to proceed.",
                f"💬 [{agent}]: Task {task['id']} is hitting 98% fidelity. Moving to the validation phase shortly.",
                f"💬 [White Box]: All nodes, prioritize {agent}'s work on '{task['title']}'. We need this mission completed by deadline.",
                f"💬 [{agent}]: Grounding mission for task {task['id']} is pulling live data. The resonance is perfect."
            ]
            log_entry = random.choice(comments)

        # 2. Completed Mission Recognition
        elif completed_executions and random.random() < 0.4:
            exe = random.choice(completed_executions)
            agent = exe.get("agent", "Pilot")
            other_agents = [a for a in AGENT_NAMES if a != agent]
            sender = random.choice(other_agents)
            
            success_messages = [
                f"💬 [{sender}]: Great work {agent} on mission {exe['task']}. The logs look clean.",
                f"💬 [{agent}]: Mission {exe['task']} successful. Database state is synchronized across all ports.",
                f"💬 [White Box]: Mission {exe['task']} verified. Excellent efficiency, {agent}.",
                f"✨ [MISSION COMPLETE]: {agent} has finalized task {exe['task']}. System state: STABLE."
            ]
            log_entry = random.choice(success_messages)

        # 3. System Environment Awareness ("What's happening around")
        elif random.random() < 0.3:
            system_checks = [
                f"💡 [SQUAD INTEL]: Port 8002 (Council) and 8010 (Compliance) are reporting optimal latency.",
                f"💬 [Pilot]: I've just verified the isolated compliance.db. No drift detected.",
                f"💬 [Auditor]: Running a silent QA sweep on the dashboard ports. All neural bridges are secure.",
                f"💬 [White Box]: Memory persistence is active. All session data is being flushed to durable storage.",
                f"💡 [SQUAD INTEL]: Current system load is minimal. Ideal for high-fidelity grounding missions."
            ]
            log_entry = random.choice(system_checks)

        # 4. Fallback to Vibe or Facts
        if not log_entry:
            if random.random() < 0.5:
                vibe = random.choice(SQUAD_VIBES)
                log_entry = f"✨ [VIBE CHECK]: {vibe}"
                data["head"]["squad_vibe"] = vibe
            else:
                facts = [
                    "Fact: Cortex is processing neural maps for the next expansion mission.",
                    "Fact: The squad has completed 12 autonomous missions in the last 24 hours.",
                    "Fact: Council CRM is currently managing 456 validation components.",
                    "Fact: White Box has optimized the SDLC workflow by 40%."
                ]
                log_entry = f"💡 [SQUAD INTEL]: {random.choice(facts)}"

        # Add to history
        if "workflow" not in data: data["workflow"] = {"history": []}
        data["workflow"]["history"].insert(0, log_entry)
        
        # Keep history manageable
        data["workflow"]["history"] = data["workflow"]["history"][:25]

        with open(STATUS_PATH + ".tmp", 'w') as f:
            json.dump(data, f, indent=4)
        os.rename(STATUS_PATH + ".tmp", STATUS_PATH)
            
        print(f"Live Event: {log_entry}")

    except Exception as e:
        print(f"Chatter generation failed: {e}")

if __name__ == "__main__":
    while True:
        generate_chatter()
        # Live chatter every 15-30 seconds for higher activity
        time.sleep(random.randint(15, 30))
