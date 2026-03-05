require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');

// Load env based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
console.log(process.env.NODE_ENV, `Loading environment from: ${envFile}`);
require('dotenv').config({ path: path.join(__dirname, envFile) });

// Fallback to .env if specific env file fails or variables missing
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Character = require('./models/Character');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';
// 增加请求体大小限制
app.use(express.json({ limit: '10mb' })); // 10MB
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    req.user = user;
    next();
  });
};

// Database Connection
const MONGO_HOST = process.env.MONGO_HOST || '127.0.0.1';
const MONGO_PORT = process.env.MONGO_PORT || '27017';
const MONGO_DB = process.env.MONGO_DB || 'bouncyballs';
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASS = process.env.MONGO_PASS;
const MONGO_AUTH_SOURCE = process.env.MONGO_AUTH_SOURCE || 'admin';

let MONGODB_URI;
if (MONGO_USER && MONGO_PASS) {
  MONGODB_URI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=${MONGO_AUTH_SOURCE}`;
} else {
  MONGODB_URI = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}`;
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Helper: Call DeepSeek API
async function fetchCharDetails(char) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const prompt = `请提供汉字“${char}”的拼音和3个常见组词。以纯JSON格式返回，不要包含markdown格式，必须包含 "pinyin" (带声调字符串) 和 "examples" (字符串数组) 两个字段。示例：{"pinyin": "hàn", "examples": ["汉字", "汉族", "男子汉"]}。`;

  console.log(`[AI] Generating details for character: ${char}...`);
  
  try {
    const response = await axios.post('https://api.deepseek.com/chat/completions', {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a helpful assistant. Please output the response in strictly valid JSON format." },
        { role: "user", content: prompt }
      ],
      response_format: {
        'type': 'json_object'
      },
      temperature: 0.1
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const content = response.data.choices[0].message.content;
    let data;
    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0]);
    } else {
      data = JSON.parse(content);
    }

    // Download Audio
    if (data.pinyin) {
        try {
            const audioUrl = `https://img.zdic.net/audio/zd/py/${data.pinyin}.mp3`;
            console.log(`[Audio] Downloading from: ${audioUrl}`);
            const audioResponse = await axios.get(encodeURI(audioUrl), { responseType: 'arraybuffer' }); // Encode URI for tones
            const base64Audio = Buffer.from(audioResponse.data, 'binary').toString('base64');
            data.audio = `data:audio/mp3;base64,${base64Audio}`;
        } catch (audioErr) {
            console.error(`[Audio] Failed to download audio for ${char}:`, audioErr.message);
            data.audio = null;
        }
    }

    // Download Stroke GIF
    try {
        // Get UTF-16BE Hex Code
        const charCode = char.charCodeAt(0).toString(16).toUpperCase();
        const strokeUrl = `https://img.zdic.net/kai/jbh/${charCode}.gif`;
        console.log(`[Stroke] Downloading from: ${strokeUrl}`);
        
        const strokeResponse = await axios.get(strokeUrl, { responseType: 'arraybuffer' });
        const base64Stroke = Buffer.from(strokeResponse.data, 'binary').toString('base64');
        data.stroke = `data:image/gif;base64,${base64Stroke}`;
    } catch (strokeErr) {
        console.error(`[Stroke] Failed to download stroke for ${char}:`, strokeErr.message);
        data.stroke = null;
    }

    return data;
  } catch (error) {
    console.error('DeepSeek API Error:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch character details from AI');
  }
}

// API Routes

// Verify Token Route
app.get('/api/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Login Route
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const user = { name: username };
    const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' }); // Token valid for 24 hours
    res.json({ accessToken });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Generate Pinyin and Examples using AI (Protected)
app.get('/api/ai-generate', authenticateToken, async (req, res) => {
  const char = req.query.char;
  if (!char) {
    return res.status(400).json({ message: 'Character is required' });
  }

  try {
    const details = await fetchCharDetails(char);
    res.json(details);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all characters (with pagination)
app.get('/api/characters', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Default 20 per page
    const skip = (page - 1) * limit;

    const characters = await Character.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Character.countDocuments();

    res.json({
      data: characters,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new character (Protected)
app.post('/api/characters', authenticateToken, async (req, res) => {
  let { char, pinyin, examples, audio, stroke } = req.body;
  
  if (!char) {
    return res.status(400).json({ message: 'Character is required' });
  }

  // If pinyin is missing, try to fetch from DeepSeek
  if (!pinyin) {
    try {
      const details = await fetchCharDetails(char);
      pinyin = details.pinyin;
      examples = details.examples;
      audio = details.audio; // Get audio from AI fetch
      stroke = details.stroke; // Get stroke from AI fetch
    } catch (error) {
      console.error('AI Fetch Error:', error.message);
      // Allow proceeding if manual entry is provided, otherwise fail
      if (!pinyin) {
        return res.status(500).json({ message: 'Failed to auto-generate Pinyin. Please enter manually or check API key.' });
      }
    }
  }

  if (!pinyin) {
     return res.status(400).json({ message: 'Pinyin is required' });
  }

  try {
    const newChar = new Character({ 
      char, 
      pinyin, 
      examples: Array.isArray(examples) ? examples : [],
      audio,
      stroke
    });
    
    const savedChar = await newChar.save();
    res.status(201).json(savedChar);
  } catch (err) {
    // Check for duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This character with pinyin already exists' });
    }
    res.status(400).json({ message: err.message });
  }
});

// Update a character (Protected)
app.put('/api/characters/:id', authenticateToken, async (req, res) => {
  try {
    const { pinyin, examples, audio, stroke } = req.body;
    
    // Find the character first to ensure it exists
    const char = await Character.findById(req.params.id);
    if (!char) return res.status(404).json({ message: 'Character not found' });

    // Update fields
    if (pinyin !== undefined) char.pinyin = pinyin;
    if (examples !== undefined) char.examples = Array.isArray(examples) ? examples : [];
    if (audio !== undefined) char.audio = audio;
    if (stroke !== undefined) char.stroke = stroke;

    const updatedChar = await char.save();
    res.json(updatedChar);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a character (Protected)
app.delete('/api/characters/:id', authenticateToken, async (req, res) => {
  try {
    const char = await Character.findById(req.params.id);
    if (!char) return res.status(404).json({ message: 'Character not found' });
    
    await char.deleteOne();
    res.json({ message: 'Character deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.send('Bouncy Balls API Server Running');
});

// Serve admin panel
// app.get('/admin', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'admin.html'));
// });

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
