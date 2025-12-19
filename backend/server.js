
//server.js
//routes get you to the page
//all the dependencies,middlwear and registerHelper 
//socket.io
// (In discord i saw that we can send emit stuff in server instead of doing api/chat/send so i did)
// creates an authenticated real-time chat system
// logged-in users can send messages via Socket.IO, 
// have those messages saved to the database
// broadcast to all connected users.

//dependencies
require('dotenv').config();

const express = require('express');
const path = require('path');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');

//routes
const SQLiteStore = require('./modules/sqlite-session-store');
const db = require('./database/database');
const authRoutes = require('./routes/auth');
const commentRoutes = require('./routes/comments');
const accountRoutes = require('./routes/account');
const chatRoutes = require('./routes/socket');

const app = express();
const PORT = process.env.PORT || 3034;


//middle ware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', true);
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));
//hbs helper for comment pagaintion
hbs.registerHelper('add', (a, b) => a + b);
hbs.registerHelper('subtract', (a, b) => a - b);
hbs.registerHelper('eq', (a, b) => a === b); 



//session store save into database for presistents
const sessionStore = new SQLiteStore({
  db: path.join(__dirname, './database/myapp.db'),
  table: 'sessions'
});

//sessionMiddleware for the app and socket io use
const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET||'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
  secure: true, 
    maxAge: 24 * 60 * 60 * 1000  // 1 day
  }
});

app.use(sessionMiddleware);

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


// Home
app.get('/', (req, res) => {
  res.render('home');
});
//  Auth routes
app.use('/api/auth', authRoutes);
app.use('/comments', commentRoutes);
app.use('/', accountRoutes);
app.use('/api/chat', chatRoutes);
//404 error
app.use((req, res, next) => {
  res.status(404).render('404');
});



//socket.io
const server = http.createServer(app)
;
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN||"https://www.linventure.com",
    methods: ["GET", "POST"],
  }
});

io.engine.use(sessionMiddleware);
//send to all
io.on('connection', (socket) => {
  const session = socket.request.session;
  //if not logged in then emit error meassage and disconncet
  if (!session || !session.userId) {
    socket.emit('error', { message: 'error go login or resigter' });
    socket.disconnect();
    return;
  }
    //check successful socket connection
    console.log(`Socket works user=${session.username} id=${socket.id}`);
    //listens the meassages that users writes 
    socket.on('chat:message', (data) => {
    // fetch profile_color from users table
    const user = db.prepare(`
      SELECT display_name, profile_color
      FROM users
      WHERE id = ?
    `).get(session.userId);
    //can't find the user, then
    if (!user) {
      console.error('user not found in socket');
      return;
    }
    //make the meassage object
    const message = {
      userId: session.userId,
      display_name: user.display_name,
      profile_color: user.profile_color,
      message: data.message,
      created_at: new Date().toISOString()
    };
    //store the content
    db.prepare(`
      INSERT INTO chat_messages
        (user_id, display_name, profile_color, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      message.userId,
      message.display_name,
      message.profile_color,
      message.message,
      message.created_at
    );
    // broadcast to all clients
    io.emit('chat:message', message);
  });

  //disconnet 
  socket.on('disconnect', () => {
    console.log(`socket disconnected: ${socket.id}`);
  });
});


server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at ${PORT}`);
});