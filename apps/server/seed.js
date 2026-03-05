require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const fs = require('fs');

// Load env based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
console.log(`Loading environment from: ${envFile}`);
require('dotenv').config({ path: path.join(__dirname, envFile) });

const Character = require('./models/Character');

// Database Connection
const MONGO_HOST = process.env.MONGO_HOST || '127.0.0.1';
const MONGO_PORT = process.env.MONGO_PORT || '27017';
const MONGO_DB = process.env.MONGO_DB || 'bouncyballs';
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASS = process.env.MONGO_PASS;
const MONGO_AUTH_SOURCE = process.env.MONGO_AUTH_SOURCE || 'admin';

let MONGODB_URI;
if (MONGO_USER && MONGO_PASS) {
  MONGODB_URI = `mongodb://${MONGO_USER}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=${MONGO_AUTH_SOURCE}`;
} else {
  MONGODB_URI = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`;
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected for Seeding'))
  .catch(err => console.error('MongoDB connection error:', err));

// Read the JSON file
const data = JSON.parse(fs.readFileSync('primary school-third.json', 'utf-8'));
let characters = [];

// Helper function to process words
function processWords(words) {
    if (!Array.isArray(words)) return;
    
    words.forEach(word => {
        if (word.char && word.pinyin) {
            // Check for duplicates in our temporary array
            const exists = characters.find(c => c.char === word.char && c.pinyin === word.pinyin);
            
            if (!exists) {
                characters.push({
                    char: word.char,
                    pinyin: word.pinyin,
                    examples: word.examples || []
                });
            } else if (word.examples && word.examples.length > 0) {
                 // Merge unique examples
                 const existingExamples = new Set(exists.examples);
                 word.examples.forEach(ex => {
                     if (!existingExamples.has(ex)) {
                         exists.examples.push(ex);
                     }
                 });
            }
        }
    });
}

// Extract data from JSON structure
Object.keys(data).forEach(gradeKey => {
    const gradeData = data[gradeKey];
    if (gradeData && typeof gradeData === 'object') {
        if (gradeData.words_recognize) processWords(gradeData.words_recognize);
        if (gradeData.words_write) processWords(gradeData.words_write);
    }
});

// Import into DB
const importData = async () => {
  try {
    await Character.deleteMany(); // Clear existing data
    console.log('Cleared existing data...');
    
    await Character.insertMany(characters);
    console.log(`Successfully imported ${characters.length} characters!`);
    
    process.exit();
  } catch (error) {
    console.error('Error with data import:', error);
    process.exit(1);
  }
};

importData();
