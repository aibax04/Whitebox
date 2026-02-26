/**
 * Prompts Index
 * Centralized exports for all prompt categories
 */

// API Prompts
const apiSystemInstructions = require('./api/systemInstructions');
const apiPromptTemplates = require('./api/promptTemplates');

// Analysis Prompts
const analysisSystemInstructions = require('./analysis/systemInstructions');
const analysisPromptTemplates = require('./analysis/promptTemplates');

// Chatbot Prompts
const chatbotSystemInstructions = require('./squadbot/systemInstructions');
const chatbotPromptTemplates = require('./squadbot/promptTemplates');

// Code Completion Prompts
const codeCompletionSystemInstructions = require('./code-completion/systemInstructions');

// Document Generation Prompts
const documentGenerationSystemInstructions = require('./document-generation/systemInstructions');
const documentGenerationPromptTemplates = require('./document-generation/promptTemplates');

// Refactoring Prompts
const refactoringSystemInstructions = require('./refactoring/systemInstructions');
const refactoringPromptTemplates = require('./refactoring/promptTemplates');

// Test Generation Prompts
const testGenerationSystemInstructions = require('./test-generation/systemInstructions');
const testGenerationPromptTemplates = require('./test-generation/promptTemplates');

// PRD Chatbot Prompts
const prdChatbotSystemInstructions = require('./prd-chatbot/systemInstructions');
const prdChatbotPromptTemplates = require('./prd-chatbot/promptTemplates');

// Strategic Planner Prompts
const strategicPlannerSystemInstructions = require('./strategic-planner/systemInstructions');
const strategicPlannerPromptTemplates = require('./strategic-planner/promptTemplates');

module.exports = {
  // API
  api: {
    systemInstructions: apiSystemInstructions,
    promptTemplates: apiPromptTemplates
  },
  
  // Analysis
  analysis: {
    systemInstructions: analysisSystemInstructions,
    promptTemplates: analysisPromptTemplates
  },
  
  // Chatbot
  chatbot: {
    systemInstructions: chatbotSystemInstructions,
    promptTemplates: chatbotPromptTemplates
  },
  
  // Code Completion
  codeCompletion: {
    systemInstructions: codeCompletionSystemInstructions
  },
  
  // Document Generation
  documentGeneration: {
    systemInstructions: documentGenerationSystemInstructions,
    promptTemplates: documentGenerationPromptTemplates
  },
  
  // Refactoring
  refactoring: {
    systemInstructions: refactoringSystemInstructions,
    promptTemplates: refactoringPromptTemplates
  },
  
  // Test Generation
  testGeneration: {
    systemInstructions: testGenerationSystemInstructions,
    promptTemplates: testGenerationPromptTemplates
  },
  
  // PRD Chatbot
  prdChatbot: {
    systemInstructions: prdChatbotSystemInstructions,
    promptTemplates: prdChatbotPromptTemplates
  },
  
  // Strategic Planner
  strategicPlanner: {
    systemInstructions: strategicPlannerSystemInstructions,
    promptTemplates: strategicPlannerPromptTemplates
  }
};
