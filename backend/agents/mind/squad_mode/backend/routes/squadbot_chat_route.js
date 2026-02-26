const express = require('express');
const router = express.Router();
const SquadBotChat = require('../data_models/squadbot_chat');
const jwt = require('jsonwebtoken');
const User = require('../data_models/roles');

// Authentication middleware
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found' });
        req.user = user;
        next();
    } catch (err) {
        console.error('JWT error:', err);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Create a new SquadBot chat session
router.post('/squadbot-chats', authMiddleware, async (req, res) => {
    try {
        const { sessionId, repoUrl, repoName, embeddingPklFile, title } = req.body;
        
        // console.log('Creating SquadBot chat session:', { sessionId, repoUrl, repoName, userId: req.user._id });
        
        if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });
        if (!repoUrl) return res.status(400).json({ error: 'Repository URL is required' });

        // Normalize repoUrl for consistent storage
        const normalizedRepoUrl = normalizeRepoUrl(repoUrl);

        const chatSession = new SquadBotChat({
            sessionId,
            userId: req.user._id,
            repoUrl: normalizedRepoUrl,
            repoName: repoName || '',
            embeddingPklFile: embeddingPklFile || null,
            title: title || 'New SquadBot Chat',
            messages: []
        });
        
        await chatSession.save();
        // console.log('SquadBot chat session created successfully:', chatSession._id);
        res.status(201).json(chatSession);
    } catch (error) {
        console.error('Error creating SquadBot chat session:', error);
        if (error.code === 11000) {
            // Duplicate sessionId
            console.log('Duplicate session ID detected:', req.body.sessionId);
            return res.status(409).json({ error: 'Chat session already exists' });
        }
        res.status(500).json({ error: 'Failed to create chat session', details: error.message });
    }
});

// Get a specific chat session
router.get('/squadbot-chats/:sessionId', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const chatSession = await SquadBotChat.findOne({ sessionId, userId: req.user._id });
        
        if (!chatSession) {
            return res.status(404).json({ error: 'Chat session not found' });
        }
        
        const sessionData = {
            _id: chatSession._id,
            sessionId: chatSession.sessionId,
            userId: chatSession.userId,
            repoUrl: chatSession.repoUrl,
            repoName: chatSession.repoName,
            embeddingPklFile: chatSession.embeddingPklFile,
            title: chatSession.title || 'New SquadBot Chat',
            messages: chatSession.messages,
            documents: chatSession.documents || [],
            createdAt: chatSession.createdAt,
            updatedAt: chatSession.updatedAt
        };
        
        res.json(sessionData);
    } catch (error) {
        console.error('Error getting SquadBot chat session:', error);
        res.status(500).json({ error: 'Failed to get chat session' });
    }
});

// Normalize repository URL for consistent matching
const normalizeRepoUrl = (url) => {
    if (!url) return '';
    // Remove trailing slashes and normalize
    return url.trim().replace(/\/+$/, '');
};

// Get chat sessions for a specific repository
router.get('/squadbot-chats/repo/:repoUrl', authMiddleware, async (req, res) => {
    try {
        const { repoUrl } = req.params;
        const decodedRepoUrl = decodeURIComponent(repoUrl);
        const normalizedRepoUrl = normalizeRepoUrl(decodedRepoUrl);
        
        console.log('Fetching chats for repoUrl:', normalizedRepoUrl);
        
        // Try exact match first
        let sessions = await SquadBotChat.find({ 
            userId: req.user._id, 
            repoUrl: normalizedRepoUrl 
        })
            .select('sessionId title repoName createdAt updatedAt messages')
            .sort({ updatedAt: -1 });
        
        // If no exact match, try with trailing slash
        if (sessions.length === 0) {
            sessions = await SquadBotChat.find({ 
                userId: req.user._id, 
                repoUrl: normalizedRepoUrl + '/' 
            })
                .select('sessionId title repoName createdAt updatedAt messages')
                .sort({ updatedAt: -1 });
        }
        
        // If still no match, try without trailing slash (if original had one)
        if (sessions.length === 0 && decodedRepoUrl.endsWith('/')) {
            sessions = await SquadBotChat.find({ 
                userId: req.user._id, 
                repoUrl: decodedRepoUrl.slice(0, -1)
            })
                .select('sessionId title repoName createdAt updatedAt messages')
                .sort({ updatedAt: -1 });
        }
        
        console.log(`Found ${sessions.length} chat sessions for repo: ${normalizedRepoUrl}`);
        
        const sessionsData = sessions.map(session => ({
            _id: session._id,
            sessionId: session.sessionId,
            title: session.title || 'New SquadBot Chat',
            repoName: session.repoName,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messageCount: session.messages?.length || 0
        }));
        
        res.json(sessionsData);
    } catch (error) {
        console.error('Error listing SquadBot chat sessions:', error);
        res.status(500).json({ error: 'Failed to list chat sessions' });
    }
});

// List all SquadBot chat sessions for the user
router.get('/squadbot-chats', authMiddleware, async (req, res) => {
    try {
        const sessions = await SquadBotChat.find({ userId: req.user._id })
            .select('sessionId title repoUrl repoName createdAt updatedAt messages')
            .sort({ updatedAt: -1 });
        
        const sessionsData = sessions.map(session => ({
            _id: session._id,
            sessionId: session.sessionId,
            title: session.title || 'New SquadBot Chat',
            repoUrl: session.repoUrl,
            repoName: session.repoName,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messageCount: session.messages?.length || 0
        }));
        
        res.json(sessionsData);
    } catch (error) {
        console.error('Error listing SquadBot chat sessions:', error);
        res.status(500).json({ error: 'Failed to list chat sessions' });
    }
});

// Delete a chat session
router.delete('/squadbot-chats/:sessionId', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        await SquadBotChat.findOneAndDelete({ sessionId, userId: req.user._id });
        res.json({ message: 'Chat session deleted successfully' });
    } catch (error) {
        console.error('Error deleting SquadBot chat session:', error);
        res.status(500).json({ error: 'Failed to delete chat session' });
    }
});

// Add a message to chat session
router.put('/squadbot-chats/:sessionId/messages', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { content, sender } = req.body;
        
        // console.log('Adding message to session:', { sessionId, sender, contentLength: content?.length });
        
        if (!content) return res.status(400).json({ error: 'Message content is required' });
        if (!sender || !['user', 'bot'].includes(sender)) {
            return res.status(400).json({ error: 'Valid sender (user or bot) is required' });
        }
        
        const chatSession = await SquadBotChat.findOne({ sessionId, userId: req.user._id });
        if (!chatSession) {
            console.log('Session not found:', sessionId, 'for user:', req.user._id);
            return res.status(404).json({ error: 'Session not found' });
        }

        chatSession.messages.push({ 
            content, 
            sender, 
            timestamp: new Date() 
        });

        // Auto-generate title from first user message if title is default
        if (chatSession.messages.length === 1 && sender === 'user' && 
            (chatSession.title === 'New SquadBot Chat' || !chatSession.title)) {
            const firstMessage = content.substring(0, 50);
            chatSession.title = firstMessage.length < content.length 
                ? firstMessage + '...' 
                : firstMessage;
        }

        chatSession.updatedAt = new Date();
        await chatSession.save();
        // console.log('Message added successfully. Total messages:', chatSession.messages.length);
        res.json(chatSession);
    } catch (error) {
        console.error('Error adding message to SquadBot chat session:', error);
        res.status(500).json({ error: 'Failed to add message to chat session', details: error.message });
    }
});

// Update chat session title
router.put('/squadbot-chats/:sessionId/title', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { title } = req.body;
        
        if (!title) return res.status(400).json({ error: 'Title is required' });
        
        const chatSession = await SquadBotChat.findOne({ sessionId, userId: req.user._id });
        if (!chatSession) return res.status(404).json({ error: 'Session not found' });

        chatSession.title = title;
        chatSession.updatedAt = new Date();
        await chatSession.save();
        res.json(chatSession);
    } catch (error) {
        console.error('Error updating SquadBot chat session title:', error);
        res.status(500).json({ error: 'Failed to update chat session title' });
    }
});

// Add document to chat session
router.post('/squadbot-chats/:sessionId/documents', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { fileName, fileType, content } = req.body;
        
        console.log('Adding document to session:', { sessionId, fileName, fileType });
        
        if (!fileName || !content) {
            return res.status(400).json({ error: 'fileName and content are required' });
        }
        
        const chatSession = await SquadBotChat.findOne({ sessionId, userId: req.user._id });
        if (!chatSession) {
            console.log('Session not found:', sessionId, 'for user:', req.user._id);
            return res.status(404).json({ error: 'Session not found' });
        }

        // Analyze the document to understand its content
        let analysis = '';
        try {
            const PORT = process.env.PORT || 3000;
            const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
            
            const aiResponse = await fetch(`${baseUrl}/api/chatbot-analysis/analyze-document`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization
                },
                body: JSON.stringify({
                    fileName,
                    fileType,
                    content
                })
            });

            if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                analysis = aiData.analysis || '';
            }
        } catch (error) {
            console.error('Error analyzing document:', error);
            // Continue without analysis
        }

        chatSession.documents.push({ 
            fileName, 
            fileType: fileType || 'other',
            content,
            analysis,
            uploadedAt: new Date() 
        });

        chatSession.updatedAt = new Date();
        await chatSession.save();
        
        console.log('Document added successfully. Total documents:', chatSession.documents.length);
        res.json(chatSession);
    } catch (error) {
        console.error('Error adding document to SquadBot chat session:', error);
        res.status(500).json({ error: 'Failed to add document to chat session', details: error.message });
    }
});

// Get documents from chat session
router.get('/squadbot-chats/:sessionId/documents', authMiddleware, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const chatSession = await SquadBotChat.findOne({ sessionId, userId: req.user._id });
        if (!chatSession) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({ documents: chatSession.documents || [] });
    } catch (error) {
        console.error('Error getting documents from SquadBot chat session:', error);
        res.status(500).json({ error: 'Failed to get documents from chat session' });
    }
});

// Delete a document from chat session
router.delete('/squadbot-chats/:sessionId/documents/:documentId', authMiddleware, async (req, res) => {
    try {
        const { sessionId, documentId } = req.params;
        
        const chatSession = await SquadBotChat.findOne({ sessionId, userId: req.user._id });
        if (!chatSession) {
            return res.status(404).json({ error: 'Session not found' });
        }

        chatSession.documents = chatSession.documents.filter(doc => doc._id.toString() !== documentId);
        chatSession.updatedAt = new Date();
        await chatSession.save();
        
        res.json({ message: 'Document deleted successfully', documents: chatSession.documents });
    } catch (error) {
        console.error('Error deleting document from SquadBot chat session:', error);
        res.status(500).json({ error: 'Failed to delete document from chat session' });
    }
});

module.exports = router;

