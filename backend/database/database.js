//database.js
//creating the data base for the project 

const Database = require('better-sqlite3');
const path = require('path');

// Connect to database file
const dbPath = path.join(__dirname, 'myapp.db');
const db = new Database(dbPath);

try{
  // creates users table if it doesn't exist
  // id autoincrments for each user(prime key)
  // username needs to be unique
  // password so it's  
  // email of the user should be unqiue
  // failed login attempt
  // lock out time
  // pofile color as one of the customizable
  // creation time of user
  db.exec(
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        failed_logins INTEGER DEFAULT 0,
        lock_until INTEGER DEFAULT 0,
        profile_color TEXT DEFAULT '#ffffff',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  );


  // comments table creates one if it doesn't exsit
  // comment id autoimerments for each comment(prime key)
  // user id is for which user made the comment 
  // content is the text 
  // created at is the time the comment was made
  // same as before the user id is a foreign key that references id in the users table
  db.exec(
    `CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`
  );

  // chat_messages table
  // id is message id (primary key)
  // user_id which user sent it
  // message is the chat content
  // created_at when message was sent
  // display_name and profile_color are retrieved via JOIN with users table
  db.exec(
    `CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`
  );

  // login attempt table creates one if it doesn't exsit
  // the id autoincerment for each attempt
  // username username used
  // ip address the ip address of said user
  // success keep track if it was successful 1 is good and the default is 0 for fail
  // timestamp the current time 
  db.exec(
    `CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        success INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  );
    console.log("success")
  }catch(err){
    console.log("fail", err.meassage)
  };

module.exports = db;