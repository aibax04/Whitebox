import os
import subprocess
import json
import logging
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - NONSTOP - %(message)s')
logger = logging.getLogger("Nonstop")

# Absolute paths to environments and scripts
PATHS = {
    "acknowledge": {
        "cwd": "/Users/psiadmin/clawd/workspace/Acknowledge/Acknowledge/backend",
        "venv": "/Users/psiadmin/clawd/workspace/Acknowledge/Acknowledge/backend/venv/bin/python3",
        "script": "seed_db.py"
    },
    "simplii": {
        "cwd": "/Users/psiadmin/clawd/workspace/simpliautomate_new", # Root for PYTHONPATH
        "venv": "/Users/psiadmin/clawd/workspace/simpliautomate_new/venv/bin/python3",
        "scripts": ["backend/db/init_products_db.py", "backend/db/init_social_listening_db.py"]
    },
    "predco": {
        "cwd": "/Users/psiadmin/clawd/workspace/PredCoAPI",
        "venv": "/Users/psiadmin/clawd/workspace/PredCoAPI/venv/bin/python3",
        "script": "seed_modules.py"
    },
}

def seed_acknowledge():
    logger.info("Syncing Acknowledge Dummy Data...")
    cfg = PATHS["acknowledge"]
    try:
        cmd = [cfg["venv"], os.path.join(cfg["cwd"], cfg["script"])]
        subprocess.run(cmd, cwd=cfg["cwd"], check=True, capture_output=True)
        return True
    except Exception as e:
        logger.error(f"Acknowledge seed failed: {e}")
        return False

def seed_simplii():
    logger.info("Syncing Simplii Dummy Data...")
    cfg = PATHS["simplii"]
    try:
        # Set PYTHONPATH so 'from backend...' works
        env = os.environ.copy()
        env["PYTHONPATH"] = cfg["cwd"]
        
        for s in cfg["scripts"]:
            cmd = [cfg["venv"], os.path.join(cfg["cwd"], s)]
            subprocess.run(cmd, cwd=cfg["cwd"], env=env, check=True, capture_output=True)
        return True
    except Exception as e:
        logger.error(f"Simplii seed failed: {e}")
        return False

def seed_predco():
    logger.info("Syncing PredCo Dummy Data...")
    cfg = PATHS["predco"]
    try:
        cmd = [cfg["venv"], os.path.join(cfg["cwd"], cfg["script"])]
        subprocess.run(cmd, cwd=cfg["cwd"], check=True, capture_output=True)
        return True
    except Exception as e:
        logger.error(f"PredCo seed failed: {e}")
        return False

def run_full_sync():
    logger.info("🚀 Initiating NONSTOP Ecosystem Synchronization...")
    results = {
        "acknowledge": seed_acknowledge(),
        "simplii": seed_simplii(),
        "predco": seed_predco()
    }
    
    # Update Dashboard Status with Dummy Data
    status_path = "/Users/psiadmin/clawd/workspace/whitebox-dashboard/frontend/public/status.json"
    try:
        with open(status_path, 'r') as f:
            data = json.load(f)
            
        success_count = sum(1 for v in results.values() if v)
        msg = f"🔄 [NONSTOP]: Ecosystem data sync complete ({success_count}/3 services updated)."
        data["workflow"]["history"].insert(0, msg)
        
        # 1. Add Dummy Tasks
        data["tasks"] = [
            {"id": "T_001", "title": "Neural Bridge Optimization", "assigned_to": "Cortex", "priority": "High", "status": "In Progress", "deadline": "2026-02-26T18:00:00"},
            {"id": "T_002", "title": "Social Sentiment Analysis", "assigned_to": "Promoter", "priority": "Medium", "status": "Pending", "deadline": "2026-02-27T12:00:00"},
            {"id": "T_003", "title": "Compliance Audit: Q1", "assigned_to": "Auditor", "priority": "Critical", "status": "Active", "deadline": "2026-02-25T20:00:00"}
        ]

        # 2. Add Dummy Executions
        data["executions"] = [
            {"id": "E_001", "agent": "Nonstop", "task": "DATA_SYNC", "status": "Success", "start_time": datetime.now().isoformat(), "log": "Full ecosystem synchronization finalized."},
            {"id": "E_002", "agent": "Cortex", "task": "T_001", "status": "Running", "start_time": datetime.now().isoformat(), "log": "Mapping neural pathways for bridge optimization..."}
        ]

        # 3. Add Dummy Projects
        data["projects"] = [
            {"name": "Project Rift", "type": "Core Engine", "status": "LIVE"},
            {"name": "Cyber Bridge", "type": "Integration", "status": "ACTIVE"},
            {"name": "Nano Dashboard", "type": "UI/UX", "status": "READY"}
        ]

        # Mark Nonstop as active
        for agent in data["agents"]:
            if agent["name"] == "Nonstop":
                agent["status"] = "success" if success_count == 3 else "warning"
                agent["last_action"] = "Sync: {}/3 Successful".format(success_count)
        
        with open(status_path, 'w') as f:
            json.dump(data, f, indent=4)
            
    except Exception as e:
        logger.error(f"Status update failed: {e}")

if __name__ == "__main__":
    run_full_sync()
