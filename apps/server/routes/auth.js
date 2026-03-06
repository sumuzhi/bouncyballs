const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.sendStatus(401);
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

function createAuthRouter(appName) {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const user = new User({
        username,
        password: hashedPassword,
      });
      await user.save();
      const token = jwt.sign(
        { id: user._id, username: user.username, app: appName },
        JWT_SECRET,
        { expiresIn: '24h' },
      );
      return res.status(201).json({
        token,
        user: { id: user._id, username: user.username },
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      const token = jwt.sign(
        { id: user._id, username: user.username, app: appName },
        JWT_SECRET,
        { expiresIn: '24h' },
      );
      return res.json({
        token,
        user: { id: user._id, username: user.username },
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.get('/verify', authenticateToken, (req, res) => {
    if (req.user.app !== appName) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return res.json({
      valid: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        app: req.user.app,
      },
    });
  });

  return router;
}

module.exports = {
  createAuthRouter,
};
