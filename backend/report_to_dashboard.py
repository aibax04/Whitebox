import json
import os
from datetime import datetime

STATUS_PATH = "/Users/psiadmin/clawd/workspace/whitebox-dashboard/frontend/public/status.json"

def report(agent_name, action, task_id=None, task_title=None, status="active", execution_log=None):
    try:
        if not os.path.exists(STATUS_PATH):
            print(f"Error: {STATUS_PATH} not found.")
            return

        with open(STATUS_PATH, 'r') as f:
            content = f.read().strip()
            
        # Robust JSON cleaning
        if not content:
            print("Status file is empty.")
            return
            
        # Find the last '}'
        last_brace = content.rfind('}')
        if last_brace != -1:
            content = content[:last_brace+1]
            
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            print(f"Initial parse failed: {e}. Attempting secondary recovery.")
            # If there are multiple root objects, try to find the first complete one
            # or just take the whole thing if it was just trailing junk
            try:
                # Try to fix common corruption (double closing braces or trailing junk)
                if content.count('{') < content.count('}'):
                    content = content[:content.rfind('}')]
                data = json.loads(content)
            except:
                print("Total recovery failed. JSON is fatally corrupted.")
                return

        # Update Head
        data["head"]["last_active"] = datetime.now().isoformat()

        # Update Agent status
        found_agent = False
        display_status = status
        if status == "self-healing":
            display_status = "active"

        target_name = agent_name.lower().replace(" ", "")
        for agent in data["agents"]:
            if agent["name"].lower().replace(" ", "") == target_name:
                agent["status"] = display_status
                agent["last_action"] = action
                found_agent = True
                break
        
        if not found_agent:
             print(f"Agent {agent_name} not found in agents list.")

        # Update Task if provided
        if task_id and task_title:
            if "tasks" not in data: data["tasks"] = []
            task_exists = False
            for t in data["tasks"]:
                if t["id"] == task_id:
                    if status == "self-healing":
                        t["status"] = "Self-Healing (Learning...)"
                    else:
                        t["status"] = "In Progress" if status == "active" else "Completed"
                    task_exists = True
                    break
            
            if not task_exists:
                task_disp_status = "In Progress"
                if status == "self-healing": task_disp_status = "Self-Healing (Learning...)"
                
                data["tasks"].insert(0, {
                    "id": task_id,
                    "title": task_title,
                    "assigned_to": agent_name,
                    "priority": "High",
                    "status": task_disp_status,
                    "deadline": (datetime.now()).isoformat()
                })

        # Update Execution log
        if execution_log:
            if "executions" not in data: data["executions"] = []
            exe_id = f"E_{task_id}" if task_id else f"E_{datetime.now().strftime('%H%M%S')}"
            
            exe_exists = False
            for e in data["executions"]:
                if e["id"] == exe_id:
                    e["log"] = execution_log
                    e["status"] = "Running" if status == "active" else "Success"
                    exe_exists = True
                    break
            
            if not exe_exists:
                data["executions"].insert(0, {
                    "id": exe_id,
                    "agent": agent_name,
                    "task": task_id or "GEN",
                    "status": "Running",
                    "start_time": datetime.now().isoformat(),
                    "log": execution_log
                })

        # Keep history clean
        if "executions" in data: data["executions"] = data["executions"][:10]
        if "tasks" in data: data["tasks"] = data["tasks"][:10]

        with open(STATUS_PATH + ".tmp", 'w') as f:
            json.dump(data, f, indent=4)
        os.rename(STATUS_PATH + ".tmp", STATUS_PATH)
        
        print(f"Successfully reported to dashboard: {agent_name} -> {action}")

    except Exception as e:
        print(f"Reporting failed: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 2:
        report(
            sys.argv[1], 
            sys.argv[2], 
            sys.argv[3] if len(sys.argv) > 3 else None,
            sys.argv[4] if len(sys.argv) > 4 else None,
            sys.argv[5] if len(sys.argv) > 5 else "active",
            sys.argv[6] if len(sys.argv) > 6 else None
        )
