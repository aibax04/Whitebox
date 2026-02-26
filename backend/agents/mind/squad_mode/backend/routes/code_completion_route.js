const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./documents');

// Get code completion
router.post('/complete', authMiddleware, async (req, res) => {
  try {
    const { prompt, language, maxOutputTokens, temperature, stopSequences } = req.body;

    if (!prompt || !language) {
      return res.status(400).json({ error: 'prompt and language are required' });
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
        requestType: 'code-completion',
        language,
        maxOutputTokens: maxOutputTokens || 1500,
        temperature: temperature || 0.1,
        stopSequences: stopSequences || ["```", "\n\n"]
      })
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      return res.status(500).json({ error: 'Failed to complete code', details: errorData });
    }

    const aiData = await aiResponse.json();
    const content = aiData?.content;

    if (!content) {
      return res.status(500).json({ error: 'No content generated from AI' });
    }

    res.json({ content });
  } catch (error) {
    console.error('Code completion error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;

