require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Load env based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
console.log(process.env.NODE_ENV, `Loading environment from: ${envFile}`);
require('dotenv').config({ path: path.join(__dirname, envFile), override: true });


const Character = require('./models/Character');
const WordPair = require('./models/WordPair');
const { createAuthRouter } = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const CORS_ORIGINS = process.env.CORS_ORIGINS || '';
const normalizeOrigin = (value) => value.replace(/\/+$/, '').trim();
const allowedOrigins = CORS_ORIGINS.split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);
// 增加请求体大小限制
app.use(express.json({ limit: '10mb' })); // 10MB
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// Middleware
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      const normalizedOrigin = normalizeOrigin(origin);
      if (
        !allowedOrigins.length ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(normalizedOrigin)
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
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

const authorizeApps = (apps) => (req, res, next) => {
  if (!req.user?.app || !apps.includes(req.user.app)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
};

const validateCharacterId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid character id' });
  }
  return next();
};

const validateWordPairId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid word pair id' });
  }
  return next();
};

const normalizeCharacterRecord = (item = {}) => {
  const char = String(item.char || '').trim();
  const pinyin = String(item.pinyin || '').trim();
  const examples = Array.isArray(item.examples)
    ? item.examples.map((entry) => String(entry || '').trim()).filter(Boolean)
    : String(item.examples || '')
      .split(/[,，|]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  const audio = item.audio || null;
  const stroke = item.stroke || null;
  return {
    char,
    pinyin,
    examples,
    audio,
    stroke,
  };
};

const normalizeWordPairDifficulty = (difficulty) => {
  const candidate = String(difficulty || 'easy').trim().toLowerCase();
  if (['easy', 'medium', 'hard'].includes(candidate)) {
    return candidate;
  }
  return 'easy';
};


const buildWordPairFilters = (req) => {
  const keyword = (req.query.keyword || '').trim();
  const difficulty = (req.query.difficulty || '').trim();
  const category = (req.query.category || '').trim();
  const filters = {};
  if (keyword) {
    filters.$or = [
      { en: { $regex: keyword, $options: 'i' } },
      { zh: { $regex: keyword, $options: 'i' } },
    ];
  }
  if (difficulty) {
    filters.difficulty = difficulty;
  }
  if (category) {
    filters.category = category;
  }
  return filters;
};

const normalizeWordPairRecord = (item = {}) => {
  const en = String(item.en || '').trim();
  const zh = String(item.zh || '').trim();
  const category = String(item.category || 'general').trim() || 'general';
  const difficulty = normalizeWordPairDifficulty(item.difficulty);
  const image = item.image || null;
  return { en, zh, category, difficulty, image };
};

const escapeCsv = (value) => `"${String(value || '').replace(/"/g, '""')}"`;

// Database Connection
const MONGO_HOST = process.env.MONGO_HOST || '127.0.0.1';
const MONGO_PORT = process.env.MONGO_PORT || '27017';
const MONGO_DB = process.env.MONGO_DB || 'bouncyballs';
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASS = process.env.MONGO_PASS;
const MONGO_AUTH_SOURCE = process.env.MONGO_AUTH_SOURCE || 'admin';

let MONGODB_URI;
if (MONGO_USER && MONGO_PASS) {
  MONGODB_URI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=${MONGO_AUTH_SOURCE}&directConnection=true`;
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

async function fetchCharactersByPrompt(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }
  const userPrompt = `用户需求：${prompt}
你是一名小学语文老师。请根据需求生成汉字学习清单，要求联网搜索用户需求，严格返回JSON，不要markdown。
JSON格式：
{"items":[{"char":"春","pinyin":"chūn","examples":["春天","春风","春雨"]}]}
要求：
1) items是数组；
2) char必须为单个汉字；
3) pinyin必须有声调；
4) examples必须是1-3个常见词语。`;
  try {
    const response = await axios.post('https://api.deepseek.com/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Return strictly valid JSON only.' },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_object',
      },
      temperature: 1.0,
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    const incoming = Array.isArray(parsed?.items) ? parsed.items : [];
    const dedup = new Set();
    const items = incoming
      .map((item) => normalizeCharacterRecord(item))
      .filter((item) => item.char && item.char.length === 1 && item.pinyin)
      .filter((item) => {
        const key = `${item.char}__${item.pinyin}`;
        if (dedup.has(key)) {
          return false;
        }
        dedup.add(key);
        return true;
      })
      .slice(0, 200);
    return items;
  } catch (error) {
    console.error('DeepSeek Batch API Error:', error.response ? error.response.data : error.message);
    throw new Error('Failed to generate character list from AI');
  }
}

async function generateImageByWord(word, isAsync = true) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('DASHSCOPE_API_KEY is not configured');
  }

  // 1. 生成图片
  const prompt = `A cute cartoon style illustration for the word "${word}". Simple, colorful, educational, suitable for children, white background.`;
  
  console.log(`[AI] Generating image for word: ${word} (Async: ${isAsync})...`);
  
  try {
    let imageUrl = null;

    if (isAsync) {
      // 异步模式：使用 wanx-v1 模型
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-Async': 'enable'
      };

      const response = await axios.post('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
        model: "wanx-v1",
        input: {
          prompt: prompt
        },
        parameters: {
          style: "<auto>",
          size: "1024*1024",
          n: 1
        }
      }, { headers });

      const taskId = response.data.output.task_id;
      console.log(`[AI] Image task started: ${taskId}`);

      // 2. 轮询任务状态
      for (let i = 0; i < 20; i++) { // 最多等待 20 * 2 = 40秒
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const taskResponse = await axios.get(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        const status = taskResponse.data.output.task_status;
        if (status === 'SUCCEEDED') {
          imageUrl = taskResponse.data.output.results[0].url;
          break;
        } else if (status === 'FAILED') {
          throw new Error(`Image generation failed: ${taskResponse.data.output.message}`);
        }
      }

      if (!imageUrl) {
        throw new Error('Image generation timed out');
      }
    } else {
      // 同步模式：使用 qwen-image-2.0-pro 模型 (multimodal-generation 接口)
      // 参考官方 Demo: https://help.aliyun.com/zh/dashscope/developer-reference/qwen-image-generation-api
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };

      const response = await axios.post('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
        model: "qwen-image-2.0-pro",
        input: {
          messages: [
            {
              role: "user",
              content: [
                {
                  text: prompt
                }
              ]
            }
          ]
        },
        parameters: {
          size: "1024*1024",
          n: 1
        }
      }, { headers });

      if (response.data.output && response.data.output.choices && response.data.output.choices[0] && response.data.output.choices[0].message && response.data.output.choices[0].message.content) {
         // Qwen-image 的返回结构中，图片通常在 content 数组中
         const content = response.data.output.choices[0].message.content;
         if (Array.isArray(content)) {
             const imgItem = content.find(item => item.image);
             if (imgItem) {
                 imageUrl = imgItem.image;
             }
         }
      } 
      
      if (!imageUrl) {
         throw new Error(`Image generation failed: ${JSON.stringify(response.data)}`);
      }
    }

    // 3. 下载并转 Base64
    console.log(`[AI] Downloading image from: ${imageUrl}`);
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');
    return `data:image/png;base64,${base64Image}`;

  } catch (error) {
    console.error('DashScope API Error:', error.response ? error.response.data : error.message);
    // Don't throw, return null to allow partial success
    return null;
  }
}

async function fetchWordDetails(word) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const prompt = `请提供单词"${word}"的中文翻译。如果是中文，请提供对应的英文翻译。如果是英文，请提供对应的中文翻译。严格返回JSON格式，包含 "en" (英文) 和 "zh" (中文) 两个字段。示例：{"en": "apple", "zh": "苹果"}`;

  console.log(`[AI] Generating details for word: ${word}...`);
  
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
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0]);
    } else {
      data = JSON.parse(content);
    }

    let image = null;
    // 只有在批量生成时，才在这里尝试异步生成图片
    // 单个单词补全时，fetchWordDetails 不再负责生成图片，而是由上层调用者（/api/ai-generate-word）决定使用同步生成
    // 这里的 data.en || word 是为了确保有英文作为 prompt
    
    return {
      en: data.en || '',
      zh: data.zh || '',
      image
    };
  } catch (error) {
    console.error('DeepSeek API Error:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch word details from AI');
  }
}

async function fetchWordPairsByPrompt(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }
  const userPrompt = `用户需求：${prompt}
你是一名英语老师。请根据需求生成单词学习清单，要求联网搜索用户需求，严格返回JSON，不要markdown。
JSON格式：
{"items":[{"en":"spring","zh":"春天","category":"season","difficulty":"easy"}]}
要求：
1) items是数组；
2) en必须为英文单词或短语；
3) zh必须为中文翻译；
4) category为分类（如food, animal, nature等），默认general；
5) difficulty为难度（easy, medium, hard），默认easy。`;
  
  try {
    const response = await axios.post('https://api.deepseek.com/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Return strictly valid JSON only.' },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_object',
      },
      temperature: 1.0,
    }, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    const incoming = Array.isArray(parsed?.items) ? parsed.items : [];
    const dedup = new Set();
    const items = incoming
      .map((item) => normalizeWordPairRecord(item))
      .filter((item) => item.en && item.zh)
      .filter((item) => {
        const key = `${item.en.toLowerCase()}__${item.zh}`;
        if (dedup.has(key)) {
          return false;
        }
        dedup.add(key);
        return true;
      })
      .slice(0, 200);

    // 批量为生成的单词异步生成图片
    // 注意：这里并行触发可能会触及 API 速率限制，实际生产中建议控制并发
    await Promise.all(items.map(async (item) => {
        try {
            const image = await generateImageByWord(item.en, true); // 使用异步生成
            item.image = image;
        } catch (imgErr) {
            console.error(`[AI] Failed to async generate image for batch item ${item.en}:`, imgErr.message);
            item.image = null;
        }
    }));

    return items;
  } catch (error) {
    console.error('DeepSeek Batch API Error:', error.response ? error.response.data : error.message);
    throw new Error('Failed to generate word list from AI');
  }
}

async function fetchAudioByPinyin(pinyin) {
  if (!pinyin) {
    return null;
  }
  try {
    const audioUrl = `https://img.zdic.net/audio/zd/py/${pinyin}.mp3`;
    console.log(`[Audio] Downloading from: ${audioUrl}`);
    const audioResponse = await axios.get(encodeURI(audioUrl), { responseType: 'arraybuffer' });
    const base64Audio = Buffer.from(audioResponse.data, 'binary').toString('base64');
    return `data:audio/mp3;base64,${base64Audio}`;
  } catch (error) {
    console.error(`[Audio] Async download failed for ${pinyin}:`, error.message);
    return null;
  }
}

async function fetchStrokeByChar(char) {
  if (!char) {
    return null;
  }
  try {
    const charCode = char.charCodeAt(0).toString(16).toUpperCase();
    const strokeUrl = `https://img.zdic.net/kai/jbh/${charCode}.gif`;
    console.log(`[Stroke] Downloading from: ${strokeUrl}`);
    const strokeResponse = await axios.get(strokeUrl, { responseType: 'arraybuffer' });
    const base64Stroke = Buffer.from(strokeResponse.data, 'binary').toString('base64');
    return `data:image/gif;base64,${base64Stroke}`;
  } catch (error) {
    console.error(`[Stroke] Async download failed for ${char}:`, error.message);
    return null;
  }
}

function enrichCharacterMediaAsync(characterId, char, pinyin) {
  Promise.resolve()
    .then(async () => {
      const current = await Character.findById(characterId).lean();
      if (!current) {
        return;
      }
      const updates = {};
      if (!current.audio) {
        const audio = await fetchAudioByPinyin(pinyin || current.pinyin);
        if (audio) {
          updates.audio = audio;
        }
      }
      if (!current.stroke) {
        const stroke = await fetchStrokeByChar(char || current.char);
        if (stroke) {
          updates.stroke = stroke;
        }
      }
      if (Object.keys(updates).length) {
        await Character.updateOne({ _id: characterId }, { $set: updates });
      }
    })
    .catch((error) => {
      console.error(`[Async Media] Failed for ${char}:`, error.message);
    });
}

// API Routes

// Auth Routes
app.use('/api/portal/auth', createAuthRouter('portal'));
app.use('/api/admin/auth', createAuthRouter('admin'));
app.use('/api/auth', createAuthRouter('portal'));

// Generate Pinyin and Examples using AI (Protected)
app.get('/api/ai-generate', authenticateToken, authorizeApps(['admin']), async (req, res) => {
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

app.post('/api/ai-generate-characters', authenticateToken, authorizeApps(['admin']), async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' });
  }
  try {
    const items = await fetchCharactersByPrompt(prompt);
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/ai-generate-word', authenticateToken, authorizeApps(['admin']), async (req, res) => {
  const word = req.query.word;
  if (!word) {
    return res.status(400).json({ message: 'Word is required' });
  }

  try {
    const details = await fetchWordDetails(word);
    
    // 单个单词补全时，尝试使用同步生成方式获取图片
    // 如果获取成功，details.image 会被覆盖
    try {
        const syncImage = await generateImageByWord(details.en || word, false);
        if (syncImage) {
            details.image = syncImage;
        }
    } catch (imgErr) {
        console.error(`[AI] Sync image generation failed, falling back to async result or null:`, imgErr.message);
    }

    res.json(details);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/ai-generate-word-pairs', authenticateToken, authorizeApps(['admin']), async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required' });
  }
  try {
    const items = await fetchWordPairsByPrompt(prompt);
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Get all characters (with pagination)
app.get('/api/characters', authenticateToken, authorizeApps(['portal', 'admin']), async (req, res) => {
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

app.get('/api/characters/export', authenticateToken, authorizeApps(['admin']), async (req, res) => {
  try {
    const data = await Character.find().sort({ createdAt: -1 });
    const header = ['char', 'pinyin', 'examples', 'createdAt'];
    const lines = [header.join(',')];
    data.forEach((item) => {
      lines.push(
        [
          escapeCsv(item.char),
          escapeCsv(item.pinyin),
          escapeCsv(Array.isArray(item.examples) ? item.examples.join('|') : ''),
          escapeCsv(item.createdAt ? item.createdAt.toISOString() : ''),
        ].join(','),
      );
    });
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="characters-${Date.now()}.csv"`);
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Add a new character (Protected)
app.post('/api/characters', authenticateToken, authorizeApps(['admin']), async (req, res) => {
  let { char, pinyin, examples, audio, stroke } = normalizeCharacterRecord(req.body);
  
  if (!char) {
    return res.status(400).json({ message: 'Character is required' });
  }
  if (char.length !== 1) {
    return res.status(400).json({ message: 'Character must be a single Chinese character' });
  }

  if (!pinyin) {
    try {
      const details = await fetchCharDetails(char);
      pinyin = details.pinyin;
      examples = details.examples;
      audio = details.audio;
      stroke = details.stroke;
    } catch (error) {
      console.error('AI Fetch Error:', error.message);
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

app.post('/api/characters/batch-import', authenticateToken, authorizeApps(['admin']), async (req, res) => {
  try {
    const incoming = Array.isArray(req.body?.items) ? req.body.items : [];
    const asyncEnrichMedia = req.body?.asyncEnrichMedia === true;
    if (!incoming.length) {
      return res.status(400).json({ message: 'Import items are required' });
    }
    const summary = {
      total: incoming.length,
      created: 0,
      skipped: 0,
      invalid: 0,
      duplicatesInFile: 0,
      duplicatedEntries: [],
    };
    const keysInFile = new Set();
    const records = [];
    incoming.forEach((raw) => {
      const record = normalizeCharacterRecord(raw);
      if (!record.char || record.char.length !== 1) {
        summary.invalid += 1;
        return;
      }
      const key = `${record.char}__${record.pinyin || ''}`;
      if (keysInFile.has(key)) {
        summary.duplicatesInFile += 1;
        return;
      }
      keysInFile.add(key);
      records.push(record);
    });

    for (let i = 0; i < records.length; i += 1) {
      const item = records[i];
      if (!item.pinyin) {
        summary.invalid += 1;
        continue;
      }
      const existed = await Character.findOne({ char: item.char, pinyin: item.pinyin }).lean();
      if (existed) {
        summary.skipped += 1;
        if (summary.duplicatedEntries.length < 20) {
          summary.duplicatedEntries.push({ char: item.char, pinyin: item.pinyin });
        }
      } else {
        const created = await Character.create(item);
        if (asyncEnrichMedia) {
          enrichCharacterMediaAsync(created._id, created.char, created.pinyin);
        }
        summary.created += 1;
      }
    }

    return res.status(200).json(summary);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Update a character (Protected)
app.put('/api/characters/:id', authenticateToken, authorizeApps(['admin']), validateCharacterId, async (req, res) => {
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
app.delete('/api/characters/:id', authenticateToken, authorizeApps(['admin']), validateCharacterId, async (req, res) => {
  try {
    const char = await Character.findById(req.params.id);
    if (!char) return res.status(404).json({ message: 'Character not found' });
    
    await char.deleteOne();
    res.json({ message: 'Character deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/word-pairs', authenticateToken, authorizeApps(['portal', 'admin']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const random = req.query.random === 'true';
    const filters = buildWordPairFilters(req);

    if (random) {
      const sampleSize = Math.max(1, Math.min(parseInt(req.query.count) || 5, 50));
      const data = await WordPair.aggregate([{ $match: filters }, { $sample: { size: sampleSize } }]);
      return res.json({
        data,
        meta: {
          total: data.length,
          page: 1,
          limit: sampleSize,
          totalPages: 1,
        },
      });
    }

    const data = await WordPair.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await WordPair.countDocuments(filters);

    return res.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.get('/api/word-pairs/export', authenticateToken, authorizeApps(['admin']), async (req, res) => {
  try {
    const filters = buildWordPairFilters(req);
    const data = await WordPair.find(filters).sort({ createdAt: -1 });
    const header = ['en', 'zh', 'category', 'difficulty', 'createdAt'];
    const lines = [header.join(',')];
    data.forEach((item) => {
      lines.push(
        [
          escapeCsv(item.en),
          escapeCsv(item.zh),
          escapeCsv(item.category),
          escapeCsv(item.difficulty),
          escapeCsv(item.createdAt ? item.createdAt.toISOString() : ''),
        ].join(','),
      );
    });
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="word-pairs-${Date.now()}.csv"`);
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.post('/api/word-pairs/batch-import', authenticateToken, authorizeApps(['admin']), async (req, res) => {
  try {
    const incoming = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!incoming.length) {
      return res.status(400).json({ message: 'Import items are required' });
    }
    const summary = {
      total: incoming.length,
      created: 0,
      skipped: 0,
      invalid: 0,
      duplicatesInFile: 0,
      duplicatedEntries: [],
    };
    const keysInFile = new Set();
    const records = [];
    incoming.forEach((raw) => {
      const record = normalizeWordPairRecord(raw);
      if (!record.en || !record.zh) {
        summary.invalid += 1;
        return;
      }
      const key = `${record.en.toLowerCase()}__${record.zh}`;
      if (keysInFile.has(key)) {
        summary.duplicatesInFile += 1;
        return;
      }
      keysInFile.add(key);
      records.push(record);
    });

    for (let i = 0; i < records.length; i += 1) {
      const item = records[i];
      const existed = await WordPair.findOne({ en: item.en, zh: item.zh }).lean();
      if (existed) {
        summary.skipped += 1;
        if (summary.duplicatedEntries.length < 20) {
          summary.duplicatedEntries.push({ en: item.en, zh: item.zh });
        }
      } else {
        await WordPair.create(item);
        summary.created += 1;
      }
    }

    return res.status(200).json(summary);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.post('/api/word-pairs', authenticateToken, authorizeApps(['admin']), async (req, res) => {
  try {
    const { en, zh, category, difficulty, image } = req.body;
    if (!en || !zh) {
      return res.status(400).json({ message: 'English and Chinese are required' });
    }
    const newWordPair = new WordPair({
      en: String(en).trim(),
      zh: String(zh).trim(),
      category: category ? String(category).trim() : 'general',
      difficulty: normalizeWordPairDifficulty(difficulty),
      image: image || null
    });
    const saved = await newWordPair.save();
    return res.status(201).json(saved);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This word pair already exists' });
    }
    return res.status(400).json({ message: err.message });
  }
});

app.put('/api/word-pairs/:id', authenticateToken, authorizeApps(['admin']), validateWordPairId, async (req, res) => {
  try {
    const { en, zh, category, difficulty, image } = req.body;
    const wordPair = await WordPair.findById(req.params.id);
    if (!wordPair) {
      return res.status(404).json({ message: 'Word pair not found' });
    }
    if (en !== undefined) {
      wordPair.en = String(en).trim();
    }
    if (zh !== undefined) {
      wordPair.zh = String(zh).trim();
    }
    if (category !== undefined) {
      wordPair.category = String(category).trim() || 'general';
    }
    if (difficulty !== undefined) {
      wordPair.difficulty = normalizeWordPairDifficulty(difficulty);
    }
    if (image !== undefined) {
      wordPair.image = image;
    }
    const updated = await wordPair.save();
    return res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This word pair already exists' });
    }
    return res.status(400).json({ message: err.message });
  }
});

app.delete('/api/word-pairs/:id', authenticateToken, authorizeApps(['admin']), validateWordPairId, async (req, res) => {
  try {
    const wordPair = await WordPair.findById(req.params.id);
    if (!wordPair) {
      return res.status(404).json({ message: 'Word pair not found' });
    }
    await wordPair.deleteOne();
    return res.json({ message: 'Word pair deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
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
