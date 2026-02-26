
import subprocess
import signal
import sys
import os
import time

processes = []

def cleanup(signum, frame):
    print("\n🛑 SHUTDOWN SEQUENCE INITIATED...")
    for p in processes:
        try:
            print(f"Terminating process {p.pid}...")
            p.terminate()
            p.wait(timeout=2)
        except subprocess.TimeoutExpired:
            print(f"Forcing kill on process {p.pid}...")
            p.kill()
        except:
            pass
    print("✅ System Offline.")
    sys.exit(0)

# Handle Ctrl+C
signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def run_command(command, cwd=None, name="Service"):
    try:
        print(f"🚀 Launching {name}...")
        process = subprocess.Popen(command, cwd=cwd, shell=False)
        processes.append(process)
        return process
    except Exception as e:
        print(f"❌ Failed to launch {name}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("==============================================")
    print("   WHITEBOX PSI - COMMAND CENTER LAUNCHER     ")
    print("==============================================")
    
    ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
    BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
    FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
    
    # 1. Start Backend API
    run_command(["python3", "api.py"], cwd=BACKEND_DIR, name="Backend API (Port 35002)")
    
    # 2. Start Frontend (Vite)
    # Check if node_modules exists, if not run npm install
    if not os.path.isdir(os.path.join(FRONTEND_DIR, "node_modules")):
        print("⚠️ node_modules not found. running npm install...")
        subprocess.run(["npm", "install"], cwd=FRONTEND_DIR)
        
    run_command(["npm", "run", "dev"], cwd=FRONTEND_DIR, name="Frontend Dashboard (Port 5173)")
    
    # 3. Start Background Services
    time.sleep(2) # Give API a moment to spin up
    run_command(["python3", "monitor_agents.py"], cwd=BACKEND_DIR, name="Agent Monitor")
    # run_command(["python3", "agent_chatter.py"], cwd=BACKEND_DIR, name="Agent Chatter") # Merged into monitor_agents.py
    
    print("\n✅ All systems operational. Press Ctrl+C to stop.")
    print("   -> Dashboard: http://localhost:5173")
    print("   -> API Status: http://localhost:35002/health")
    
    # Keep main thread alive
    while True:
        time.sleep(1)
