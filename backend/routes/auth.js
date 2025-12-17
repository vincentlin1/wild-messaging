// routes/auth.js
//most if it was taken by the text book
const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../database/database');
const { validatePassword, hashPassword, comparePassword } = require('../modules/password_auth');
const {validateEmail} = require('../modules/email_auth.js');

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
    if (!username || !password || !email || !display_name) {
      return res.redirect('/api/auth/register?error=' + encodeURIComponent('All fields are required'));
    }
   
    // Validate password requirements
    const validPass = validatePassword(password);
    if (!validPass.valid) {
      const passErrorsText = validPass.errors.join(', ');
      return res.redirect('/api/auth/register?error=' + encodeURIComponent('Password does not meet requirements: ' + passErrorsText));
    }
   
    // Check if username already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
        console.log('user already exist')
      return res.redirect('/api/auth/register?error=' + encodeURIComponent('Username already exists. Please choose a different username.'));
    }
    // If the username and display_name is the same error
    if (username===display_name){
      console.log('user and displayname is the same')
      return res.redirect('/api/auth/register?error=' + encodeURIComponent('Username and display name can not be the same. Please choose a different username or displayname.'));
    };
    // if email exist already tell them to enter another or use forgot password
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingEmail) {
        console.log('email already exist')
      return res.redirect('/api/auth/register?error=' + encodeURIComponent('Email already exists. Please choose a different Email or click forgot password.'));
    }
    //very simple vaild email comformation
    const vaildEmail = validateEmail(email);
      if (!vaildEmail.valid) {
      const emailErrorsText = vaildEmail.errors.join(', ');
      return res.redirect('/api/auth/register?error=' + encodeURIComponent('Email Does not meet minimum requirement: ' + emailErrorsText));
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
    res.redirect('/api/auth/login?success=' + encodeURIComponent('Registration successful. Please log in.'));
   
  } catch (error) {
    console.error('Registration error:', error);
    return res.redirect('/api/auth/register?error=' + encodeURIComponent('Internal server error'));
  }
});


/**
 * GET /login - Show login form
 */
router.get('/login', (req, res) => {
  const error = req.query.error;  // get error from query string
  const success = req.query.success; // success message
  res.render('login.hbs',{error,success});
});


/**
 * POST /login - Authenticate user
 */
router.post('/login', async (req, res) => {
  try {
    const {  username, password } = req.body;
    const ip = req.ip; //get the ip
    const now = Date.now();
   
    // Validate input
    if (!username || !password) {
        console.log('username password required')
      return res.redirect('/api/auth/login?error=' + encodeURIComponent('Username and password are required'));
    }
   
    // find user by username
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
   
    if (!user) {
      console.log('username or pass not match')
      db.prepare('INSERT INTO login_attempts (username, ip_address) VALUES (?, ?)').run(username, ip);
      // Don't reveal if username exists (security best practice)
      return res.redirect('/api/auth/login?error=' + encodeURIComponent('Invalid username or password'));
     
    }
    // check if account is locked
    if (user.lock_until && now < user.lock_until) {
      const minutes = Math.ceil((user.lock_until - now) / 60000);
      return res.redirect('/api/auth/login?error=' + encodeURIComponent(`Account locked. Try again in ${minutes} minute(s).`));
    }

    // Compare entered password with stored hash
    const passwordMatch = await comparePassword(password, user.password_hash);
   
    if (!passwordMatch) {
      console.log('username or pass not match')
      let failed = user.failed_logins + 1;
      let lockUntil = 0;

      // lock the account if failed attempts exceed 5
      if (failed >= 5) {
        lockUntil = now + 15 * 60 * 1000; // 15 minutes
        failed = 0; // reset failed attempts after locking
      }

      // update failed login count and lock_until
      db.prepare('UPDATE users SET failed_logins = ?, lock_until = ? WHERE id = ?')
        .run(failed, lockUntil, user.id);

      //update failed attempt
      db.prepare('INSERT INTO login_attempts (username, ip_address) VALUES (?, ?)').run(username, ip);

      return res.redirect('/api/auth/login?error=' + encodeURIComponent('Invalid username or password'));
    }
   
    // successful login → reset failed attempts and lock_until
    db.prepare('UPDATE users SET failed_logins = 0, lock_until = 0 WHERE id = ?').run(user.id);
    // log successful login
    db.prepare('INSERT INTO login_attempts (username, ip_address, success) VALUES (?, ?, 1)').run(username, ip);
    // Create session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.display_name = user.display_name;
    req.session.isLoggedIn = true;
   
    // Redirect to success page
    res.redirect(`/`);
   
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/api/auth/login?error=' + encodeURIComponent('Internal server error'));
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
    res.redirect('/');
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