/**
 * Strategic Planner Prompt Templates
 * Contains prompt templates for roadmap generation from PRD documents
 */

const buildRoadmapGenerationPrompt = (prdContent, startDate, endDate) => {
  const startYear = new Date(startDate).getFullYear();
  const endYear = new Date(endDate).getFullYear();

  return `
You are an expert product manager. Analyze the following Product Requirements Document (PRD) and generate a comprehensive product roadmap in swimlane format with the following structure:

PRD Content:
${prdContent}

Project Timeline: From ${startDate} to ${endDate}

Return the roadmap in JSON format with this exact structure (fill dynamically based on the PRD and timeline):

{
  "title": "Product name and roadmap title",
  "overview": "Brief overview of the product vision and strategy",
  "timeframe": {
    "startYear": ${startYear},
    "endYear": ${endYear},
    "quarters": ["Q1", "Q2", "Q3", "Q4"]
  },
  "swimlanes": [
    {
      "id": "swimlane_1",
      "name": "Team/Area name (e.g. Frontend, Backend, Product/Design, QA/DevOps)",
      "color": "Hex color code (e.g. rgb(249, 93, 2) for Frontend, rgb(0, 252, 235) for Backend, rgb(0, 208, 255) for Product/Design, rgb(0, 255, 136) for QA/DevOps)",
      "tasks": [
        {
          "id": "task_1",
          "title": "Task name (e.g. User Authentication UI, Backend API Development, Product Design, QA Testing)",
          "description": "Detailed description of the task",
          "startDate": "YYYY-MM-DD",
          "endDate": "YYYY-MM-DD",
          "color": "Same as swimlane color",
          "swimlane": "swimlane_1",
          "priority": "High | Medium | Low",
          "status": "Not-started",
          "assignee": ""
        }
      ]
    }
  ],
  "milestones": [
    {
      "id": "milestone_1",
      "title": "Milestone name (e.g. MVP Launch, Core Features, Beta Release, Full Launch)",
      "date": "YYYY-MM-DD",
      "description": "Detailed description of the milestone"
    }
  ]
}

Requirements:
1. Derive 2-6 swimlanes (teams/areas) dynamically from the PRD (e.g., Frontend, Data Platform, Integrations, Design, QA, DevOps, etc.)
2. Generate 5-8 tasks per swimlane with realistic timelines within the specified date range (${startDate} to ${endDate})
3. Assign distinct, consistent colors per swimlane and use the swimlane color for its tasks
4. Tasks should have realistic start/end dates within the provided timeline
5. Include 4-6 major milestones spread across the timeline
6. Ensure tasks overlap and run parallel to show concurrent work
7. Make task names specific and actionable
8. Vary task durations appropriately within the timeline
9. Respect dependencies from the PRD (don't schedule dependent tasks before prerequisites)
10. Balance workload across swimlanes and time periods
11. All data must come from the PRD; no mock or filler content
12. All dates must be within the range ${startDate} to ${endDate}

Focus on creating a visual timeline that clearly shows parallel work streams and key deliverables within the specified timeframe.

IMPORTANT: Return ONLY the JSON object, no additional text or markdown formatting.
`;
};

module.exports = {
  buildRoadmapGenerationPrompt
};

