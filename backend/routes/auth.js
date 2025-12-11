// routes/auth.js
//most if it was taken by the text book
const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../database/database');
const { validatePassword, hashPassword, comparePassword } = require('../modules/password_auth');


/**
 * GET /register - Show registration form
 */
router.get('/register', (req, res) => {
    // send the errors meassage or
    const error = req.query.error;  // get error from query string
    const success = req.query.success; // success message
    res.render('register', { error, success });
    //res.sendFile(path.join(__dirname, '../views/register.hbs'));
});




// POST /register - Register a new user
 
router.post('/register', async (req, res) => {
  try {
    const { email,username,display_name, password } = req.body;
   
    // Validate input
    if (!username || !password) {
      return res.redirect('/api/auth/register?error=' + encodeURIComponent('Username and password are required'));
    }
   
    // Validate password requirements
    const validation = validatePassword(password);
    if (!validation.valid) {
      const errorsText = validation.errors.join(', ');
      return res.redirect('/api/auth/register?error=' + encodeURIComponent('Password does not meet requirements: ' + errorsText));
    }
   
    // Check if username already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
        console.log('user already exist')
      return res.redirect('/api/auth/register?error=' + encodeURIComponent('Username already exists. Please choose a different username.'));
    }
   
    // Hash the password before storing
    const passwordHash = await hashPassword(password);
   
    // Insert new user into database
    const stmt = db.prepare(`
  INSERT INTO users (username, password_hash, email, display_name)
  VALUES (?, ?, ?, ?)`);


    stmt.run(
      username,
      passwordHash,
      email,
      display_name                   
    );
   
    // Redirect to success page with username
    console.log('user sucess')
    res.redirect(`/login`);
   
  } catch (error) {
    console.error('Registration error:', error);
    return res.redirect('/api/auth/register?error=' + encodeURIComponent('Internal server error'));
  }
});


/**
 * GET /login - Show login form
 */
router.get('/login', (req, res) => {
  res.render('login.hbs');
});


/**
 * POST /login - Authenticate user
 */
router.post('/login', async (req, res) => {
  try {
    const {  username, password } = req.body;
   
    // Validate input
    if (!username || !password) {
        console.log('username password required')
      return res.redirect('/api/auth/login?error=' + encodeURIComponent('Username and password are required'));
    }
   
    // Find user by username
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
   
    if (!user) {
        console.log('password not match')
      // Don't reveal if username exists (security best practice)
      return res.redirect('/api/auth/login?error=' + encodeURIComponent('Invalid username or password'));
     
    }
   
    // Compare entered password with stored hash
    const passwordMatch = await comparePassword(password, user.password_hash);
   
    if (!passwordMatch) {
        console.log('password not match')
      return res.redirect('/api/auth/login?error=' + encodeURIComponent('Invalid username or password'));
    }
   
    // Successful login - update last login time
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
      .run(user.id);
   
    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.isLoggedIn = true;
   
    // Redirect to success page
    res.redirect(`/`);
   
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/views/comments');
  }
});


/**
 * GET /logout - Logout user (GET version for easy link access)
 */
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('views/comments');
    }
    res.redirect('/views/comments');
  });
});


/**
 * POST /logout - Logout user (POST version)
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
        console.error('Logout error:', err);
        return res.redirect('/public/error.html?message=' + encodeURIComponent('An error occurred while logging out.') + '&back=/');
    }
    res.redirect('/public/logged-out.html');
  });
});


/**
 * GET /me - Get current user info (requires authentication)
 */
router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/public/error.html?message=' + encodeURIComponent('You must be logged in to view this page.') + '&back=/api/auth/login');
  }
 
  const user = db.prepare('SELECT id, username, created_at, last_login FROM users WHERE id = ?')
    .get(req.session.userId);
 
  if (!user) {
    return res.redirect('/public/error.html?message=' + encodeURIComponent('User not found in database.') + '&back=/');
  }
 
  // Pass user data as query parameters to the profile page
  const params = new URLSearchParams({
    id: user.id,
    username: user.username,
    created_at: user.created_at || 'N/A',
    last_login: user.last_login || 'Never'
  });
 
  res.redirect(`/public/profile.html?${params.toString()}`);
});


module.exports = router;