  const express = require('express');
  const router = express.Router();
  const db = require('../database/database');

  // /comments gets the comment
router.get('/', (req, res) => {
  const maxPerPage = 5;//20 comments per page
  const pages = [];//array of pages that was created

  // get the page number safely
  let page = parseInt(req.query.page, 10);
  //if there is none or less then page = 1
  if (isNaN(page) || page < 1){
    page = 1;
  } 

  // total number of comments in the database 
  const totalComments = db.prepare(`
    SELECT COUNT(*) AS count FROM comments
  `).get().count;
  
  //find the total pages needed
  const totalPages = Math.ceil(totalComments / maxPerPage);

  //  if the page is too large then page will be reset to the max total page
  if (page > totalPages && totalPages > 0) {
    page = totalPages;
  }

  //offest is the (page - 1) * 20
  const offset = (page - 1) * maxPerPage;
  // fetch paginated comments by the newest first and load in the max and offset by

  const rows = db.prepare(`
    SELECT
      c.content,
      c.created_at,
      u.display_name,
      u.profile_color
    FROM comments c
    JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(maxPerPage, offset);
// send the comments 
  const comments = rows.map(c => ({
    display_name: c.display_name,
    content: c.content,
    created_at: new Date(c.created_at).toLocaleString(),
    profile_color: c.profile_color
  }));
//  page number array for
for (let i = 1; i <= totalPages; i++) {
  pages.push({
    number: i,
    current: i === page
  });
}
//render and load the comments 
  res.render('comments', {
    comments,
    page,
    totalPages,
    totalComments,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    pages
  });
});


  // /new_comment section
  router.get('/new_comment', (req, res) => {
    if (!req.session?.userId) {
      return res.render('login', {
        error: 'You must be logged in to post a comment.'
      });
    }

    res.render('new_comment');
  });

  //  post /comment where you can acutally type the comment and instert into table 
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
