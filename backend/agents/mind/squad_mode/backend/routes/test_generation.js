const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./documents');

// Generate test cases for a function
router.post('/generate-tests', authMiddleware, async (req, res) => {
  try {
    const { functionName, language, testType, functionCode } = req.body;

    if (!functionName || !language || !testType) {
      return res.status(400).json({ error: 'functionName, language, and testType are required' });
    }

    const prompt = `Generate a ${testType} test case for the following ${language} function:
\`\`\`${language}
${functionCode || `function ${functionName}() { /* implementation */ }`}
\`\`\`
Function name: ${functionName}
Focus on testing ${testType} scenarios.`;

    // Call the internal /api/generate endpoint
    const PORT = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    
    const aiResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        requestType: 'test-generation'
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to generate test cases', details: errorData });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content });
  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;

