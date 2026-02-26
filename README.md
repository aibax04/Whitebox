
# Whitebox Dashboard

This project has been restructured for better organization.

## Structure

- **frontend/**: Contains all frontend code.
  - `index.html`: Main entry point.
  - `home.html`: Homepage.
  - `static/`: CSS files.
  - `public/`: Assets served by Vite (images, status.json).
  - `vite.config.js`: Vite configuration.

- **backend/**: Contains backend logic and agents.
  - `api.py`: FastAPI server.
  - `agents/`: Python files for each agent.
  - `agents/mind/`: Mind files (markdown) for each agent.
  - `agent_chatter.py`: Simulates agent chatter.
  - `monitor_agents.py`: Monitors agent status.
  - `ingest_skill.py`: Skill ingestion logic.
  - `report_to_dashboard.py`: Utility for reporting status.

## Usage

### Quick Start
To launch the entire stack (Frontend + Backend + Agents):
```bash
python3 run.py
```

### Manual Usage
### FrontendHtml
Navigate to `frontend/` and run:
```bash
npm install
npm run dev
```

### Backend
Navigate to `backend/` and run the API:
```bash
python3 api.py
```

To start monitoring/chatter (these run independently):
```bash
python3 monitor_agents.py
python3 agent_chatter.py
```
