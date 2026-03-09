const mongoose = require('mongoose');

const WordPairSchema = new mongoose.Schema({
  en: {
    type: String,
    required: true,
    trim: true,
  },
  zh: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    default: 'general',
    trim: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

WordPairSchema.index({ en: 1, zh: 1 }, { unique: true });

module.exports = mongoose.model('WordPair', WordPairSchema);
