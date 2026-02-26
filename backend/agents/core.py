
import sys
import os
import time
import json
from datetime import datetime
from dotenv import load_dotenv
import google.generativeai as genai

# ═══════ PATH SETUP ═══════
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__)) # backend/agents
BACKEND_DIR = os.path.dirname(CURRENT_DIR)               # backend
ROOT_DIR = os.path.dirname(BACKEND_DIR)                  # whitebox-dashboard
SIMPLIAUTOMATE_DIR = os.path.join(ROOT_DIR, "../simpliautomate_new")

# Add backend to sys.path to allow importing sibling modules
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

# ═══════ ENVIRONMENT SETUP ═══════
ENV_PATH = os.path.join(SIMPLIAUTOMATE_DIR, ".env")
load_dotenv(ENV_PATH)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
MODEL_NAME = "gemini-1.5-flash"

# ═══════ SHARED UTILITIES ═══════
try:
    from report_to_dashboard import report
except ImportError:
    # Fallback reporting if module not found
    def report(agent_name, action, **kwargs):
        print(f"[{agent_name}] {action}: {kwargs}")

# ═══════ BASE AGENT CLASS ═══════
class Agent:
    def __init__(self, name, role):
        self.name = name
        self.role = role
        self.mind_content = self.load_mind()
        self.model = self.get_model()
        
    def get_model(self):
        if GEMINI_API_KEY:
            return genai.GenerativeModel(MODEL_NAME)
        return None

    def load_mind(self):
        """Loads the agent's specific mind file (Markdown)."""
        # Handle spaces in name (White Box -> whitebox_mind.md)
        safe_name = self.name.lower().replace(" ", "")
        mind_path = os.path.join(CURRENT_DIR, "mind", f"{safe_name}_mind.md")
        
        # Try alternate naming (White Box -> white_box_mind.md) just in case
        if not os.path.exists(mind_path):
             safe_name_alt = self.name.lower().replace(" ", "_")
             mind_path_alt = os.path.join(CURRENT_DIR, "mind", f"{safe_name_alt}_mind.md")
             if os.path.exists(mind_path_alt):
                 mind_path = mind_path_alt

        if os.path.exists(mind_path):
            with open(mind_path, 'r') as f:
                return f.read()
        return f"# {self.name}\nRole: {self.role}\n"

    def track_usage(self, usage):
        """Logs authentic token usage to a shared log file."""
        try:
            input_tok = usage.prompt_token_count
            output_tok = usage.candidates_token_count
            total_tok = input_tok + output_tok
            
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "agent": self.name,
                "input": input_tok,
                "output": output_tok,
                "total": total_tok
            }
            
            # Atomic append to log file in backend root
            log_path = os.path.join(BACKEND_DIR, "token_usage.log")
            with open(log_path, "a") as f:
                f.write(json.dumps(log_entry) + "\n")
                
            print(f"[{self.name}] Used {total_tok} tokens (In: {input_tok}, Out: {output_tok})")
            
        except Exception as e:
            print(f"[{self.name}] Failed to track tokens: {e}")

    def think(self, prompt, context=""):
        """Generates a thought using the Gemini model and tracks tokens."""
        if not self.model:
            return "Analysis complete. (Simulated - No API Key)"
            
        full_prompt = f"""
        IDENTITY: You are {self.name}, an AI Agent with role: {self.role}.
        CORE KNOWLEDGE:
        {self.mind_content}
        
        TASK CONTEXT:
        {context}
        
        USER REQUEST:
        {prompt}
        
        Respond as {self.name}.
        """
        try:
            response = self.model.generate_content(full_prompt)
            
            # Capture Authentic Token Usage
            if hasattr(response, "usage_metadata"):
                self.track_usage(response.usage_metadata)
                
            return response.text
        except Exception as e:
            return f"Cognitive Error: {str(e)}"

    def log(self, message, status="active"):
        """Reports status to the dashboard."""
        print(f"[{self.name}] {message}")
        report(self.name, "log", status=status, execution_log=message)

    def run(self):
        """Main lifecycle loop."""
        print(f"🚀 {self.name} ({self.role}) connected to Neural Core.")
        self.log(f"Online and monitoring. linked to {MODEL_NAME}")
        
        # Keep process alive and pulsing
        while True:
            time.sleep(60) # Heartbeat every minute
            self.log("System check execution: Nominal.", status="active")
