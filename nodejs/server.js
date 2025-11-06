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
//users 
const users = [];

//all this for testing got it from Class nots 
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

//Real code starts 
// render register page
app.get("/register", (req, res) => {
  res.render("register");
});

//  register form 
app.post("/register", (req, res) => {
  //find the username and password requests
  const { username, password } = req.body;

  // checks if username already exists, u is a arrow => function as return true or flase
  const exists = users.find( u => u.username === username);

  //if it exist then it mean already taken return error msg where the hbs will handle the see 
  if (exists) {
    return res.render("register", {
      error: "username already taken. Try another."
    });
  }

  //add the object of username and password to the users
  //found how to append object into array https://www.geeksforgeeks.org/javascript/how-to-add-an-object-to-an-array-in-javascript/
  users.push({ username, password });

  //ask the user to got to log in page to log in 
  return res.render("register", {
    success: "Yay! Go to login page, you can now log in."
  });
});

//also from notes to check and understand the logic 
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
