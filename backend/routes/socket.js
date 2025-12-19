//socket.js
//gets the chat page and renders it
// gets history form database and
// sorts them by the 20 newest then 
//reverse it to show newest at bottom

const express = require('express');
const router = express.Router();
const db = require('../database/database');


// render chat page
router.get('/', (req, res) => {
    
  if (!req.session?.userId) {
    return res.redirect('/api/auth/login');
  }
  res.render('chat');
});

// GET /api/chat/history
router.get('/history', (req, res) => {
    //if not signed in and error
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  //get all the past meassages the newst ones first 
  const messages = db.prepare(`
    SELECT
      u.display_name,
      u.profile_color,
      c.message,
      c.created_at
    FROM chat_messages c
    JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC
    LIMIT 20
  `).all();

    //send the meassage in reverse so new ones go at the bottom
  res.json(messages.reverse());
});

module.exports = router;
