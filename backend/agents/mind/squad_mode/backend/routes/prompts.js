const express = require('express');
const router = express.Router();
const prompts = require('../prompts');

/**
 * GET /api/prompts
 * Get all available prompt categories
 */
router.get('/', (req, res) => {
  try {
    const categories = Object.keys(prompts);
    res.json({
      success: true,
      categories,
      message: 'Available prompt categories retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting prompt categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve prompt categories',
      error: error.message
    });
  }
});

/**
 * GET /api/prompts/:category
 * Get all prompts for a specific category
 */
router.get('/:category', (req, res) => {
  try {
    const { category } = req.params;
    
    if (!prompts[category]) {
      return res.status(404).json({
        success: false,
        message: `Category '${category}' not found`
      });
    }

    res.json({
      success: true,
      category,
      prompts: prompts[category],
      message: `Prompts for category '${category}' retrieved successfully`
    });
  } catch (error) {
    console.error(`Error getting prompts for category ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve prompts',
      error: error.message
    });
  }
});

/**
 * GET /api/prompts/:category/system-instructions
 * Get system instructions for a specific category
 */
router.get('/:category/system-instructions', (req, res) => {
  try {
    const { category } = req.params;
    
    if (!prompts[category] || !prompts[category].systemInstructions) {
      return res.status(404).json({
        success: false,
        message: `System instructions for category '${category}' not found`
      });
    }

    res.json({
      success: true,
      category,
      systemInstructions: prompts[category].systemInstructions,
      message: `System instructions for category '${category}' retrieved successfully`
    });
  } catch (error) {
    console.error(`Error getting system instructions for category ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system instructions',
      error: error.message
    });
  }
});

/**
 * GET /api/prompts/:category/prompt-templates
 * Get prompt templates for a specific category
 */
router.get('/:category/prompt-templates', (req, res) => {
  try {
    const { category } = req.params;
    
    if (!prompts[category] || !prompts[category].promptTemplates) {
      return res.status(404).json({
        success: false,
        message: `Prompt templates for category '${category}' not found`
      });
    }

    res.json({
      success: true,
      category,
      promptTemplates: prompts[category].promptTemplates,
      message: `Prompt templates for category '${category}' retrieved successfully`
    });
  } catch (error) {
    console.error(`Error getting prompt templates for category ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve prompt templates',
      error: error.message
    });
  }
});

/**
 * POST /api/prompts/:category/generate
 * Generate a prompt using templates for a specific category
 */
router.post('/:category/generate', (req, res) => {
  try {
    const { category } = req.params;
    const { template, params } = req.body;
    
    if (!prompts[category] || !prompts[category].promptTemplates) {
      return res.status(404).json({
        success: false,
        message: `Prompt templates for category '${category}' not found`
      });
    }

    const promptTemplates = prompts[category].promptTemplates;
    
    if (!promptTemplates[template]) {
      return res.status(404).json({
        success: false,
        message: `Template '${template}' not found in category '${category}'`
      });
    }

    // Generate the prompt using the template and parameters
    let generatedPrompt;
    if (typeof promptTemplates[template] === 'function') {
      generatedPrompt = promptTemplates[template](...params);
    } else {
      generatedPrompt = promptTemplates[template];
    }

    res.json({
      success: true,
      category,
      template,
      prompt: generatedPrompt,
      message: `Prompt generated successfully using template '${template}'`
    });
  } catch (error) {
    console.error(`Error generating prompt for category ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate prompt',
      error: error.message
    });
  }
});

module.exports = router;
