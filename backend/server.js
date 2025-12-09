const express = require('express');
const app = express();
const path = require('path');
const hbs = require('hbs');
const cookieParser = require('cookie-parser'); 
const PORT = process.env.PORT || 3034;

// Middleware all got from Tombstone
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // Add this line
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));
//users array
const users = [];
//comments array
const comments = [];
 
app.get('/', (req, res) => {
  //no users yest then user is null
  let user = null
    
    // Check if cookie exists and parse it
    if (req.cookies && req.cookies.Session) {
        user = JSON.parse(req.cookies.Session);
    }
    //renders the home page with passing user data
    res.render('home', { user: user });
});

//renders login 
app.get("/login", (req, res) => {
  res.render("login");
});

// Handle form submission - now sets a cookie
app.post('/login', (req, res) => {
  //get the username and password requests from the form body
    const { username, password } = req.body;
    //see if there exists a user in the users array with matching username and password
    const user = users.find(u => u.username === username && u.password === password);
    // if user doesn't exist then return invails username or password
    if (!user) {
      return res.render("login", {
        error: "incorrect username or password."
      });
    }

    // Set cookie with username 
    res.cookie('Session', JSON.stringify({
        username: username, 
    }), { 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: false,
        sameSite: "lax"
    });
    // if all good the return home 
    res.redirect('/');
});


//render register page
app.get("/register", (req, res) => {
  res.render("register");
});

//  register form 
app.post("/register", (req, res) => {
  //get the username and password requests from the form body
  const { username, password } = req.body;

  // checks if username already exists
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

  //ask the user to got to log in page to log in | I could just do res.render(login,{success:"you can now log in"})
  return res.render("login", {
    success: "Yay! you can now log in."
  });
});

//also from notes to check and understand the logic 
//If click on logout it clears cookies 
app.get("/logout", (req, res) => {
    // Clear the cookie
    res.clearCookie("Session");
    //  back to home page
    res.redirect("/");
});


// Render new comment page, only if logged in
app.get("/new_comment", (req, res) => {
    let user = null;

    if (req.cookies && req.cookies.Session) {
        user = JSON.parse(req.cookies.Session);
    }

    if (!user) {
        // Not logged in, show login page with error
        return res.render("login", { error: "You must be logged in to post a comment." });
    }

    // Render new comment page with user info
    res.render("new_comment", { user });
});

// Handle posting a new comment
app.post("/comment", (req, res) => {
    let user = null;
    // see if there is cookies are set
    if (req.cookies && req.cookies.Session) {
        user = JSON.parse(req.cookies.Session);
    }
    // if user doesn't exist aka not logged in not the go to login and the error msg
    if (!user) {
        return res.render("login", { error: "You must be logged in to post a comment." });
    }
    //get the text
    const { text } = req.body;
    //if theres no text then send error msg
    if ( text.trim() == "") {
        return res.render("new_comment", { user, error: "Comment cannot be empty." });
    }
    //the comment then is append to comments arr with author as the username and the text as the text and time as when they hit the btn
    comments.push({
        author: user.username,
        text: text,
        timestamp: new Date()
    });

    //to the comments page after posting
    res.redirect("/comments");
});
// display all comments
app.get("/comments", (req, res) => {
    let user = null;
    if (req.cookies && req.cookies.Session) {
        user = JSON.parse(req.cookies.Session);
    }
    res.render("comments", { user, comments });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
