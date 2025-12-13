const express = require('express');
const router = express.Router();
const db = require('../database/database');

/**
 * GET /comments
 */
router.get('/', (req, res) => {
  let user = null;
  let isLoggedIn = false;

  if (req.session?.userId) {
    user = { id: req.session.userId };
    isLoggedIn = true;
  }

  const rows = db.prepare(`
    SELECT
      c.content,
      c.created_at,
      u.display_name
    FROM comments c
    JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC
  `).all();

  // Map DB → legacy template fields
  const comments = rows.map(c => ({
    display_name: c.display_name,
    content: c.content,
    created_at: new Date(c.created_at).toLocaleString()
  }));

  res.render('comments', { user, comments, isLoggedIn  });
});

/**
 * GET /new_commen
 */
router.get('/new_comment', (req, res) => {
  if (!req.session?.userId) {
    return res.render('login', {
      error: 'You must be logged in to post a comment.'
    });
  }

  res.render('new_comment');
});

/**
 * POST /comment
 */
router.post('/comment', (req, res) => {
  if (!req.session?.userId) {
    return res.render('login', {
      error: 'You must be logged in to post a comment.'
    });
  }

  const text = req.body.text?.trim();

  if (!text) {
    return res.render('new_comment', {
      error: 'Comment cannot be empty.'
    });
  }

  db.prepare(`
    INSERT INTO comments (user_id, content, created_at)
    VALUES (?, ?, ?)
  `).run(req.session.userId, text, Date.now());

  res.redirect('/comments');
});

module.exports = router;
