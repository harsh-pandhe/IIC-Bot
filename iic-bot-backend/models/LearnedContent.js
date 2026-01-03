// models/LearnedContent.js
const mongoose = require('mongoose');

const learnedContentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    vectorId: {
        type: String,
        required: true
    },
    taughtBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    taughtByName: String,
    source: {
        type: String,
        default: 'User_taught_memory.txt'
    },
    category: String,
    tags: [String],
    isActive: {
        type: Boolean,
        default: true
    },
    usageCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes
learnedContentSchema.index({ taughtBy: 1 });
learnedContentSchema.index({ isActive: 1 });
learnedContentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('LearnedContent', learnedContentSchema);
