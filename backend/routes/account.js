const express = require('express');
const router = express.Router();
const db = require('../database/database');
const {
  validatePassword,
  hashPassword,
  comparePassword
} = require('../modules/password_auth');
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

  const user = db.prepare(`
    SELECT password_hash
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  // verify current password
  const ok = await comparePassword(current_password, user.password_hash);
  if (!ok) {
    return res.redirect('/profile?error=Incorrect current password');
  }

  // validate new password
  const validation = validatePassword(new_password);
  if (!validation.valid) {
    return res.redirect('/profile?error=' +
      encodeURIComponent(validation.errors.join(', ')));
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
  const { password, newEmail } = req.body;

  const user = db.prepare(`
    SELECT password_hash
    FROM users
    WHERE id = ?
  `).get(req.session.userId);
    //compare password to see if it's ok
  const ok = await comparePassword(password, user.password_hash);
  if (!ok) {
    return res.redirect('/profile?error=Incorrect password');
  }
  //vaildate the email
  const valid = validateEmail(newEmail);
  if (!valid.valid) {
    return res.redirect('/profile?error=' +
      encodeURIComponent(valid.errors.join(', ')));
  }
  //see if the new email exists if it does then change
  const exists = db.prepare(`
    SELECT id FROM users WHERE email = ?
  `).get(newEmail);
  if (exists) {
    return res.redirect('/profile?error=Email already in use');
  }
  //change email
  db.prepare(`
    UPDATE users
    SET email = ?
    WHERE id = ?
  `).run(newEmail, req.session.userId);

  res.redirect('/profile?success=Email updated');
});


// change diaplay name
router.post('/profile/display-name', requireAuth, async (req, res) => {
  const { password, display_name } = req.body;

  
  const user = db.prepare(`
    SELECT password_hash
    FROM users
    WHERE id = ?
  `).get(req.session.userId);
    // compare password to see change the display
  const ok = await comparePassword(password, user.password_hash);
  if (!ok) {
    return res.redirect('/profile?error=Incorrect password');
  }
  //change it to new display name
  db.prepare(`
    UPDATE users
    SET display_name = ?
    WHERE id = ?
  `).run(display_name, req.session.userId);

  res.redirect('/profile?success=Display name updated');
});

// change /color
router.post('/profile/color', requireAuth, (req, res) => {
  const allowedColors = ['blue', 'red', 'green', 'purple', 'orange'];
  const { color } = req.body;

  if (!allowedColors.includes(color)) {
    return res.status(400).send('Invalid color');
  }

  db.prepare(`
    UPDATE users SET profile_color = ? WHERE id = ?
  `).run(color, req.session.userId);

  res.redirect('/profile');
});



module.exports = router;
