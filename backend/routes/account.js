const express = require('express');
const router = express.Router();
const db = require('../database/database');
const {validatePassword,hashPassword, comparePassword} = require('../modules/password_auth');
const { validateEmail } = require('../modules/email_auth');

// require login
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/api/auth/login');
  }
  next();
}

//get /profile

router.get('/profile', requireAuth, (req, res) => {
  const user = db.prepare(`
    SELECT username, email, display_name, profile_color
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  res.render('profile', { user });
});


// change password

router.post('/profile/password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;

  const userAuth = db.prepare(`
    SELECT password_hash
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  const user = db.prepare(`
    SELECT username, email, display_name, profile_color
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  // verify current password
  const ok = await comparePassword(current_password, userAuth.password_hash);
  if (!ok) {
    return res.render('profile', { user, error:"Not the current password" });
  }

  // validate new password
  const validation = validatePassword(new_password);
  if (!validation.valid) {
    return res.render('profile', { user, error: validation.error });
  }

  const newHash = await hashPassword(new_password);

  db.prepare(`
    UPDATE users
    SET password_hash = ?
    WHERE id = ?
  `).run(newHash, req.session.userId);

  // destory the sessions and make them login again
  req.session.destroy(() => {
    res.redirect('/api/auth/login?success=Password changed. Please log in again.');
  });
});


// change email
router.post('/profile/email', requireAuth, async (req, res) => {
  const { password, new_email } = req.body;

  const userAuth = db.prepare(`
    SELECT password_hash
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  const user = db.prepare(`
    SELECT username, email, display_name, profile_color
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

    //compare password to see if it's ok
  const ok = await comparePassword(password, userAuth.password_hash);
  if (!ok) {
    return res.render('profile', { user, error:"Not the current password" });
  }

  //vaildate the email
  const valid = validateEmail(new_email);
  if (!valid.valid) {
    return res.render('profile', { user, error: valid.errors });
  }

  //see if the new email exists if it does then change
  const exists = db.prepare(`
    SELECT id FROM users WHERE email = ?
  `).get(new_email);

  if (exists) {
    return res.render('profile', { user, error: "Email already in use" });
  }

  //change email
  db.prepare(`
    UPDATE users
    SET email = ?
    WHERE id = ?
  `).run(new_email, req.session.userId);
   //get updated info 
  const updatedUser = db.prepare(`
    SELECT username, email, display_name, profile_color
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  return res.render('profile', { user: updatedUser, success: "Email has been changed" });
});


// change diaplay name
router.post('/profile/display-name', requireAuth, async (req, res) => {
  const { password, display_name } = req.body;

  
  const userAuth = db.prepare(`
    SELECT password_hash
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  const user = db.prepare(`
    SELECT username, email, display_name, profile_color
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

    // compare password to see change the display
  const ok = await comparePassword(password, userAuth.password_hash);
  if (!ok) {
     return res.render('profile', { user, error:"Not the current password" });
  }
  //if display name is same as usernamme error
  if (display_name === user.username) {
    return res.render('profile', { user, error: "Display name cannot be the same as username" });
  }

  //change it to new display name
  db.prepare(`
    UPDATE users
    SET display_name = ?
    WHERE id = ?
  `).run(display_name, req.session.userId);

  const updatedUser = db.prepare(`
    SELECT username, email, display_name, profile_color
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  return res.render('profile', { user: updatedUser, success: "Display name has been changed" });
});

// change /color
router.post('/profile/color', requireAuth, (req, res) => {
  const allowedColors = ['blue', 'red', 'green', 'purple', 'orange', 'white'];
  const { color } = req.body;

  // if not an allow color invaild color
  if (!allowedColors.includes(color)) {
    return res.send('Invalid color');
  }

  // update the colors 
  db.prepare(`
    UPDATE users SET profile_color = ? WHERE id = ?
  `).run(color, req.session.userId);

  res.redirect('/profile');
});



module.exports = router;
