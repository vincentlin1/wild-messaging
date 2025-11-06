const express = require('express');
const app = express();
const path = require('path');
const hbs = require('hbs');
const cookieParser = require('cookie-parser'); 
const PORT = process.env.PORT || 3034;

// Middleware all got from Tombstone
app.use(express.static(path.join(__dirname, 'asset')));
app.use(express.json());
//app.use(express.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // Add this line
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

const users = [];

//app.use(express.static('public'));

// API Routes
// Note: We don't include '/api' in our routes because nginx strips it when forwarding
// nginx receives: http://localhost/api/users
// nginx forwards to: http://backend-nodejs:3000/users (without /api)
/*
app.get('/', (req, res) => {
    res.json({ 
        message: 'Hello from the API!',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'nodejs-backend'
    });
});
*/
app.get('/', (req, res) => {
    let user = {
        name: "Guest",
        msg: "Welcome! Please set your name."
    };
    
    // Check if cookie exists and parse it
    if (req.cookies && req.cookies.name) {
        user = JSON.parse(req.cookies.name);
    }
    
    res.render('home', { user: user });
});

// Page to change name
app.get('/change', (req, res) => {
    res.render('changePage');
});

// Handle form submission - now sets a cookie
app.post('/setname', (req, res) => {
    const name = (req.body && req.body.name) ? req.body.name : '';
    
    // Set cookie with user data
    res.cookie('name', JSON.stringify({
        name: name, 
        msg: "Hello there!"
    }), { 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: false,
        sameSite: "lax"
    });
    
    res.redirect('/');
});
// render register page
app.get("/register", (req, res) => {
  res.render("register");
});

//  Handle register form submission
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  // Check if username already exists u => function as return true or flase
  const exists = users.find( u => u.username === username);


  if (exists) {
    return res.render("register", {
      error: "Username already taken. Try another."
    });
  }

  //found how to append object into array https://www.geeksforgeeks.org/javascript/how-to-add-an-object-to-an-array-in-javascript/
  users.push({ username, password });

  return res.render("register", {
    success: "success ! you can now log in."
  });
});

//If click on logout it clears cookies 
app.get("/logout", (req, res) => {
    // Clear the cookie
    res.clearCookie("name");

    //  back to home page
    res.redirect("/");
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
