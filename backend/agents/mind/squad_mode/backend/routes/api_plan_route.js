const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./documents');

// Generate API plan
router.post('/generate-plan', authMiddleware, async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

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
        requestType: 'api-plan'
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to generate API plan', details: errorData });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content });
  } catch (error) {
    console.error('API plan generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;

