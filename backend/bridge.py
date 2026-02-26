import requests
import os
import json
from datetime import datetime

class UniversalNeuralBridge:
    """
    Unified interface for Whitebox Agents to interact with Acknowledge and Simpliautomate.
    """
    def __init__(self):
        self.acknowledge_url = "http://localhost:8005"
        self.simplii_url = "http://localhost:35000"
        self.predco_url = "http://localhost:8010"
        
        # Default Admin Credentials for bridges
        self.ack_auth = ("admin@compliance.com", "admin123")
        self.simplii_auth = ("admin@simplii.ai", "admin123") # Assuming standard
        self.predco_auth = ("hp", "hp")
        
        self._tokens = {}

    def _get_token(self, service):
        if service in self._tokens:
            return self._tokens[service]
        
        try:
            if service == "acknowledge":
                res = requests.post(f"{self.acknowledge_url}/auth/login", 
                                    data={"username": self.ack_auth[0], "password": self.ack_auth[1]},
                                    headers={"Content-Type": "application/x-www-form-urlencoded"})
                token = res.json().get("access_token")
            elif service == "simplii":
                 # Simplii might have a different login flow, assuming standard form for now
                 res = requests.post(f"{self.simplii_url}/api/login", 
                                     json={"email": "mohdaibad04@gmail.com", "password": "password123"})
                 token = res.json().get("access_token")
            elif service == "predco":
                res = requests.post(f"{self.predco_url}/api/token/", 
                                    data={"username": self.predco_auth[0], "password": self.predco_auth[1]},
                                    headers={"Content-Type": "application/x-www-form-urlencoded"})
                token = res.json().get("access")
            
            if token:
                self._tokens[service] = token
                return token
        except Exception as e:
            print(f"Auth failed for {service}: {e}")
        return None

    # --- Acknowledge Bridges ---
    def create_ack_task(self, title, description, assigned_to_id=1):
        token = self._get_token("acknowledge")
        if not token: return {"error": "Auth failed"}
        
        res = requests.post(f"{self.acknowledge_url}/tasks/", 
                            json={"title": title, "description": description, "assigned_to_id": assigned_to_id, "priority": "medium"},
                            headers={"Authorization": f"Bearer {token}"})
        return res.json()

    def send_ack_notification(self, title, content):
        token = self._get_token("acknowledge")
        if not token: return {"error": "Auth failed"}
        
        res = requests.post(f"{self.acknowledge_url}/notifications/", 
                            json={"title": title, "content": content, "notification_type": "BROADCAST"},
                            headers={"Authorization": f"Bearer {token}"})
        return res.json()

    # --- Simpliautomate Bridges ---
    def fetch_simplii_news(self):
        token = self._get_token("simplii")
        if not token: return {"error": "Auth failed"}
        
        res = requests.get(f"{self.simplii_url}/api/fetch-news", 
                           headers={"Authorization": f"Bearer {token}"})
        return res.json()

    def generate_simplii_post(self, news_item_id, prefs=None):
        token = self._get_token("simplii")
        if not token: return {"error": "Auth failed"}
        
        # news_item_id should be like "db_1"
        payload = {
            "news": {"id": news_item_id},
            "prefs": prefs or {"vibe": "Professional", "post_type": "LinkedIn"}
        }
        res = requests.post(f"{self.simplii_url}/api/generate-post", 
                             json=payload,
                             headers={"Authorization": f"Bearer {token}"})
        return res.json()

    # --- PredCo Bridges ---
    def get_predco_dashboard(self):
        token = self._get_token("predco")
        if not token: return {"error": "Auth failed"}
        
        res = requests.get(f"{self.predco_url}/api/core/dashboard/", 
                           headers={"Authorization": f"Bearer {token}"})
        return res.json()

    # --- Nonstop Bridges ---
    def trigger_nonstop_sync(self):
        """Triggers the local data maintenance engine."""
        import subprocess
        try:
            subprocess.Popen(["python3", "/Users/psiadmin/clawd/workspace/whitebox-dashboard/backend/nonstop_data_engine.py"])
            return {"status": "success", "message": "Nonstop sync initiated"}
        except Exception as e:
            return {"error": str(e)}

bridge = UniversalNeuralBridge()
