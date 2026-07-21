const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, organization } = req.body;
    if (!name || !email || typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ error: 'name, email, and a password of at least 12 characters are required' });
    }
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, organization, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, organization, role`,
      [name, email, hashed, organization || null, 'volunteer']
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { id: String(user.id), email: user.email, role: user.role,
        tenantId: process.env.GOVERNANCE_TENANT_ID, subjectIds: [`account:${user.id}`] },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '8h' }
    );
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email, password required' });
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: String(user.id), email: user.email, role: user.role,
        tenantId: process.env.GOVERNANCE_TENANT_ID, subjectIds: [`account:${user.id}`] },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '8h' }
    );
    res.json({
      user: { id: user.id, name: user.name, email: user.email, organization: user.organization, role: user.role },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, organization, role FROM users WHERE id = $1',
      [req.user.id],
    );
    if (result.rows.length !== 1) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
