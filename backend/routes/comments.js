//comment.js
// get '/' loads the comments from database use Pagination to load per page
// use max preview to limit the meassage seen by user
// get new comments loads the page
//new comment renders the form page to submit content
// new comments limit the max words to 500
// then sends it to database 

const express = require('express');
const router = express.Router();
const db = require('../database/database');

  // /comments gets the comment
router.get('/', (req, res) => {
  const maxPerPage = 10;//10 comments per page
  const pages = [];//array of pages that was created

  // get the page number safely
  let page = parseInt(req.query.page, 10);

  //if there is none or less then page will always be = 1
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

  // fetch the page comments by the newest first and load in by the max per page and offset by
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
  
 

  const maxPreview = 200;


// send the comments 
const comments = rows.map(c => {
  const isLong = c.content.length > maxPreview;
  return {
    display_name: c.display_name,
    content: c.content,
    preview: isLong ? c.content.slice(0, maxPreview) + '...' : c.content,// if it isLong then it will cut till 200 chars then append '...' else the content
    full: c.content, // full content
    isLong,// if it is long
    created_at: new Date(c.created_at).toLocaleString(),//date
    profile_color: c.profile_color
  };
});

// page number array with dict of number and current page
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
  
  // Just render the form - no validation needed here
  res.render('new_comment');
});

  //  post /new_comment where you can acutally type the comment and instert into table 
router.post('/new_comment', (req, res) => {
  if (!req.session?.userId) {
    return res.render('login', {
      error: 'You must be logged in to post a comment.'
    });
  }
  //max comment length 
  const maxComLen = 500;
  const text = req.body.text?.trim();
 

  if (!text) {
    return res.render('new_comment', {
      error: 'Comment cannot be empty.'
    });
  }
  

  //of more then 500 then error
  if (text.length > maxComLen) {
    return res.render('new_comment', {
      error: `comment must be ${maxComLen} characters or less.`
    });
  }

  //instert into db 
  db.prepare(`
    INSERT INTO comments (user_id, content, created_at)
    VALUES (?, ?, ?)
  `).run(req.session.userId, text, Date.now());


  res.redirect('/comments');
});

  module.exports = router;
