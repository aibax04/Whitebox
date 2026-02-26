const mongoose = require('mongoose');

const DiagramSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['hld', 'lld', 'erd'], 
        required: true 
    },
    title: { 
        type: String, 
        required: true 
    },
    prdContent: { 
        type: String, 
        required: true 
    },
    mermaidCode: { 
        type: String, 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

module.exports = mongoose.model('Diagram', DiagramSchema);