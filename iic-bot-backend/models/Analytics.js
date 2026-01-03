// models/Analytics.js
const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    questionId: {
        type: String,
        unique: true,
        required: true
    },
    question: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    userRole: {
        type: String,
        default: 'guest'
    },
    sources: [String],
    responseTime: {
        type: Number
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    feedback: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Indexes for analytics queries
analyticsSchema.index({ timestamp: -1 });
analyticsSchema.index({ userRole: 1 });
analyticsSchema.index({ rating: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
