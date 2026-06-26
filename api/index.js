const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service_role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' }
});

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'hvemkanhvornaar-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to verify JWT token
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

// POST /api/login - Login with username and password
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Fetch user from database using service_role
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/users - Create a new user (admin-only)
app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, role = 'user' } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert([
        { username, password_hash: passwordHash, role }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/users - List all users (admin-only)
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, created_at');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ users });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/polls - Create a new poll (admin-only)
app.post('/api/polls', requireAuth, requireAdmin, async (req, res) => {
  const { title, dates } = req.body;
  if (!title || !dates || !Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({ error: 'Title and dates are required' });
  }

  try {
    const { data: poll, error } = await supabase
      .from('polls')
      .insert([
        { title, dates, created_by: req.user.id }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ poll });
  } catch (err) {
    console.error('Create poll error:', err);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// GET /api/polls - List all polls
app.get('/api/polls', async (req, res) => {
  try {
    const { data: polls, error } = await supabase
      .from('polls')
      .select('id, title, dates, created_at, created_by:users(username)');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ polls });
  } catch (err) {
    console.error('Fetch polls error:', err);
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

// GET /api/polls/:id - Get a single poll with votes
app.get('/api/polls/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch poll
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id, title, dates, created_at, created_by:users(username)')
      .eq('id', id)
      .single();

    if (pollError || !poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Fetch votes for this poll
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('id, selected_dates, user_id:users(username)')
      .eq('poll_id', id);

    if (votesError) {
      return res.status(400).json({ error: votesError.message });
    }

    res.json({ poll, votes });
  } catch (err) {
    console.error('Fetch poll error:', err);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// POST /api/votes - Submit a vote
app.post('/api/votes', requireAuth, async (req, res) => {
  const { poll_id, selected_dates } = req.body;
  if (!poll_id || !selected_dates || !Array.isArray(selected_dates) || selected_dates.length === 0) {
    return res.status(400).json({ error: 'poll_id and selected_dates are required' });
  }

  try {
    // Check if poll exists
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id')
      .eq('id', poll_id)
      .single();

    if (pollError || !poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Submit vote
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .insert([
        { poll_id, user_id: req.user.id, selected_dates }
      ])
      .select()
      .single();

    if (voteError) {
      return res.status(400).json({ error: voteError.message });
    }

    res.json({ vote });
  } catch (err) {
    console.error('Submit vote error:', err);
    res.status(500).json({ error: 'Failed to submit vote' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
