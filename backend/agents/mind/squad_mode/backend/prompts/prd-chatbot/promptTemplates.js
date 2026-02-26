/**
 * PRD Chatbot Prompt Templates
 * Contains prompt templates for PRD chatbot operations
 */

const buildTemplateAnalysisPrompt = (content, fileName) => {
  return `
Analyze this PRD template file and understand its structure, sections, and style:

TEMPLATE FILE: ${fileName}
CONTENT:
${content}

Based on this template, analyze:
1. Document structure and sections present
2. Writing style and tone used
3. Level of detail expected in each section
4. Key headings and subheadings format
5. Content organization patterns
6. Format preferences (bullet points, tables, paragraphs)
7. Success metrics and KPI patterns
8. Technical requirements format
9. Business context structure

Provide a comprehensive analysis of this template that will help me:
- Ask questions in the same style and depth as the template
- Generate a PRD following the exact structure and format
- Match the professional tone and presentation style
- Include all sections found in the template with similar depth

Focus on understanding the template's approach to requirements gathering and documentation style. Do not use markdown formatting in your response.
`;
};

const buildFileAnalysisPrompt = (content, fileName) => {
  return `
Analyze this uploaded document and extract relevant product information:

DOCUMENT: ${fileName}
CONTENT:
${content.substring(0, 4000)}${content.length > 4000 ? '\n[... content truncated]' : ''}

Based on this document, identify:
1. Product type and domain (Describe in one line what kind of product it is and its industry/domain)
2. Business requirements or goals (Summarize the main business objectives in one line)
3. Key features or functionalities mentioned (List the main features or functions in one line)
4. Technical constraints or considerations (State any technical limitations or requirements in one line)
5. Any user personas or target audience described (Describe the target users or personas in one line)
6. Existing requirements or features mentioned (Mention any already defined requirements or features in one line)
7. Target audience or users (Summarize who the intended users are in one line)
8. Business goals or objectives (State the business goals in one line)
9. Technical constraints or preferences (Summarize technical preferences or restrictions in one line)
10. Missing information (List any important missing details in one line)


IMPORTANT:
Do not list out the information you found, just focus on the questions that should be asked to complete the PRD. Also, do not list out all of the questions that should be asked, just focus on the top three questions that should be asked to complete the PRD.
Provide a concise analysis focusing on what product requirements information is available and what additional questions should be asked to complete the PRD. Do not use markdown formatting, asterisks, hashtags, or any special symbols in your response.
`;
};

const buildNextQuestionPrompt = (conversationHistory, currentState, templateAnalysis) => {
  const recentMessages = conversationHistory.slice(-6).map(m => 
    `${m.type}: ${m.content}`
  ).join('\n');

  const aspects = [
    'Product vision and goals',
    'User needs and requirements',
    'Target users and use cases',
    'Key features and functionality',
    'Success metrics and KPIs',
    'Technical requirements',
    'Business constraints',
    'Timeline and priorities'
  ];
  const nextAspect = aspects.find(aspect => (currentState.aspectQuestionCounts[aspect] || 0) < 3);

  const templateContext = templateAnalysis ? `
PRD TEMPLATE ANALYSIS:
${templateAnalysis}

Use this template analysis to guide your question style and depth to match the template's approach.
` : '';

  return `
You are assisting in building a complete PRD through a structured conversation. You are an interactive chatbot with the ability to generate questions and answers to help the user build a complete PRD.
You can also analyze the uploaded file and use the template analysis to guide your question style and depth to match the template's approach.

Your task: Be interactive, understand user's responses and answer them in a conversational manner. Greet the user and ask them how you can help them. Generate the next most valuable, specific, and actionable question for the following aspect of the PRD:
ASPECT TO FOCUS ON: ${nextAspect}

${templateContext}

CONVERSATION HISTORY:
${recentMessages}

CURRENT PHASE: ${currentState.currentPhase}
COLLECTED INFO: ${JSON.stringify(currentState.collectedInfo)}
QUESTIONS ALREADY ASKED: ${currentState.questionsAsked.join(', ')}
ASPECT QUESTION COUNTS: ${JSON.stringify(currentState.aspectQuestionCounts)}

Guidelines:
- ASK ONLY 3 QUESTIONS PER ASPECT to ensure depth and clarity.
- Do not repeat questions already asked.
- Ask concise, to the point questions that build on previous answers.
- The length of the question should be between 20 and 40 words.
- Ask only one question in a single message.
- Use the collected information to inform your question.
- Focus only on the aspect: "${nextAspect}".
- Make the question conversational, detailed, and designed to elicit meaningful responses.
- Avoid generic, superficial, or irrelevant questions.
${templateAnalysis ? '- Match the questioning style and depth indicated by the PRD template analysis.' : ''}
- Match the questioning style and depth indicated by the PRD template analysis.
- Match the questioning style and depth indicated by the aspect question counts.

Once all 3 questions for this aspect are asked, move to the next aspect.
`;
};

const buildComprehensivePRDPrompt = (conversationHistory) => {
  const allMessages = conversationHistory.map(m => 
    `${m.type}: ${m.content}`
  ).join('\n\n');

  return `
  CONVERSATION:
${allMessages}

Generate a complete PRD with these sections:

1. EXECUTIVE SUMMARY: 
Product Overview and Objectives (100-150 words)

2. PRODUCT OVERVIEW: 
Product description and core value proposition (200-300 words)

3. OBJECTIVES AND GOALS: 
Business goals, objectives, and success metrics (200-300 words)

4. USE CASES: 
Use cases, user personas, and user stories (300-400 words)

5. PRODUCT FEATURES AND FUNCTIONAL REQUIREMENTS: 
Core features, functionality and feature prioritization (500-700 words) 

6. USER EXPERIENCE: 
Entry points, core experience, and user interface requirements (300-400 words)

7. SUCCESS METRICS: 
Key performance indicators, tracking plan, user centric metrics, business metrics and technical metrics (200-300 words)

8. TECHNICAL CONSIDERATIONS: 
Technical requirements, constraints, and dependencies (200-300 words)

9. RISK ASSESSMENT: 
Technical, business, and market risks (200-300 words)

10. QUESTIONS AND ANSWERS:
Anticipated questions and prepared answers (200-300 words)

11. TIMELINE:
Feature prioritization, team requirements and members, tasks assigned to members, turn-around-time for each task and timeline for every member of each team. (200-300 words)

12. CONCLUSION: 
Summary and next steps (100-150 words)

Format the document with clear headings. 
Each section should be detailed and comprehensive. 

Adhere to the following guidelines:
- Use clear, concise language 
- Use professional business document style and tone
- Use whitespace effectively to enhance readability
- Use a formal, professional tone throughout
- Use paragraphs for detailed explanations where necessary
- Structure the document with clear headings and sub-headings
- Bold the titles, headings and sections 
- Use numbers for sub-sections only
- Use bullets for lists only
- Use colons to introduce lists or sections
- Do not print date, author, or version information

Ensure the document is 2000-3000 words in total. Do not print any markdown symbols.
Do not print any markdown symbols. Generate a complete PRD that could be used as a direct replacement for the template, filled with the specific product information from the conversation.
`;
};

const buildPRDFromTemplatePrompt = (conversationHistory, selectedTemplate) => {
  const allMessages = conversationHistory.map(m => 
    `${m.type}: ${m.content}`
  ).join('\n\n');

  const templateContext = selectedTemplate ? `
TEMPLATE TO FOLLOW:
${selectedTemplate.content}
TEMPLATE ANALYSIS:
${selectedTemplate.templateAnalysis}

Use this template structure and format as a guide for generating the PRD. Follow the template's sections and organization while incorporating the conversation content.

` : '';

  return `
CONVERSATION:
${allMessages}

TEMPLATE CONTEXT:
${templateContext}

TEMPLATE TO FOLLOW:
${selectedTemplate.content}

TEMPLATE ANALYSIS:
${selectedTemplate.templateAnalysis}

Create a comprehensive Product Requirements Document (PRD) based on this conversation and the provided PRD template. Follow the exact structure, style, format, and depth of detail from the template when creating the PRD.

Guidelines:
- Do not add sections that don't exist in the template, and do not omit sections that are present in the template.
- Always adhere to the template's structure, headings, subheadings, and organization pattern exactly.
- Always use the template's section order and hierarchy.
- Always use the template's writing style and tone.
- Write the content for each section in the template's format and style.
- Adhere to the template's tone and style.
- Always follow the template's structure and format.
- Adhere to the conversation content and incorporate it into the template.
- Do not add any filler content or unnecessary information.
- Do not add any new sections that don't exist in the template.
- Do not omit any sections that are present in the template.
- Format the document with clear headings and sub-headings.
- Do not print date, author, or version information.
- Use clear, concise language 
- Use professional business document style and tone
- Use whitespace effectively to enhance readability
- Use a formal, professional tone throughout
- Use paragraphs for detailed explanations where necessary
- Structure the document with clear headings and sub-headings
- Bold the titles, headings and sections 
- Use numbers for sub-sections only
- Use bullets for lists only
- Use colons to introduce lists or sections
- Do not print date, author, or version information
- Always use the template's section order and hierarchy.
`;
};



module.exports = {
  buildTemplateAnalysisPrompt,
  buildFileAnalysisPrompt,
  buildNextQuestionPrompt,
  buildComprehensivePRDPrompt,
  buildPRDFromTemplatePrompt
};
