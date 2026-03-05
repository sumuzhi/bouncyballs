const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema({
  char: {
    type: String,
    required: true,
    trim: true
  },
  pinyin: {
    type: String,
    required: true,
    trim: true
  },
  examples: {
    type: [String],
    default: []
  },
  audio: {
    type: String, // Store Base64 string of the MP3
    default: null
  },
  stroke: {
    type: String, // Store Base64 string of the Stroke GIF
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index for char and pinyin to avoid duplicates
CharacterSchema.index({ char: 1, pinyin: 1 }, { unique: true });

module.exports = mongoose.model('Character', CharacterSchema);
