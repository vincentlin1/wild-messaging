const express = require('express');
const path = require('path');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const SQLiteStore = require('./modules/sqlite-session-store');
const db = require('./database/database');
const authRoutes = require('./routes/auth');
const commentRoutes = require('./routes/comments');
const accountRoutes = require('./routes/account');

const app = express();
const PORT = process.env.PORT || 3034;


//  Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));



//session
const sessionStore = new SQLiteStore({
  db: path.join(__dirname, './database/myapp.db'),
  table: 'sessions'
});
app.use(session({
  store: sessionStore,
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
  secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000  // 1 day
  }
}));
app.use((req, res, next) => {
  if (req.session?.userId) {
    const user = db.prepare(`
      SELECT id, username, display_name, profile_color
      FROM users
      WHERE id = ?
    `).get(req.session.userId);

    res.locals.user = user || null;
  } else {
    res.locals.user = null;
  }
  next();
});
// Home for now 
app.get('/', (req, res) => {
  res.render('home');
});
//  Auth routes
app.use('/api/auth', authRoutes);
app.use('/comments', commentRoutes);
app.use('/', accountRoutes);


//  Routes for normal
app.use('/', authRoutes);
app.use('/', commentRoutes);



//  Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(` Server running at ${PORT}`);
});
