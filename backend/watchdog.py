import os
import subprocess
import time
import socket

PORT_MAP = {
    "Dashboard Frontend": 5173,
    "Dashboard API": 35002,
    "Council CRM": 8002,
    "Compliance BE": 8010,
    "Compliance FE": 5174
}

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def restart_service(name):
    # Service restarts disabled: User handling servers manually.
    print(f"⚠️ Service {name} is reported DOWN. Manual restart required.")
    pass

def main():
    print("🛡️ Whitebox Connection Watchdog Active.")
    while True:
        for name, port in PORT_MAP.items():
            if not is_port_open(port):
                restart_service(name)
            else:
                pass
        
        # Check background logic scripts
        mon_check = subprocess.run(["pgrep", "-f", "monitor_agents.py"], capture_output=True).stdout
        if not mon_check:
            print("RESTARTING: monitor_agents.py")
            subprocess.Popen(["nohup", "python3", "backend/monitor_agents.py"], cwd="/Users/psiadmin/clawd/workspace/whitebox-dashboard")
            
        chat_check = subprocess.run(["pgrep", "-f", "agent_chatter.py"], capture_output=True).stdout
        if not chat_check:
            print("RESTARTING: agent_chatter.py")
            subprocess.Popen(["nohup", "python3", "backend/agent_chatter.py"], cwd="/Users/psiadmin/clawd/workspace/whitebox-dashboard")

        time.sleep(10)

if __name__ == "__main__":
    main()
