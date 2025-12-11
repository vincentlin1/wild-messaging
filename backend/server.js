const express = require('express');
const path = require('path');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');
const session = require('express-session');


const db = require('./database/database');
const authRoutes = require('./routes/auth');


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


//  Auth routes
app.use('/api/auth', authRoutes);


//  Routes

app.use('/', authRoutes);

// Home for now 
app.get('/', (req, res) => {



  res.render('home');
  
});



//  Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(` Server running at ${PORT}`);
});
