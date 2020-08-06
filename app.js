let express = require("express");
let session = require("express-session");
let bodyParser = require("body-parser");
let db = require("./dataBase");


//setup basic things (express app, body parser, sessions)
const PORT = 3000;

let app = express();
let urlencodedParser = bodyParser.urlencoded({ extended: false });
app.set('view engine', 'pug');
app.set('views', './views');

app.use(session({
    secret: "BruhahA2642",
    cookie: { maxAge: 3600000 },
    resave: false,
    saveUninitialized: false
}));

//redirect if not loggen in funtion
let redirect_unauth = function (req, res, callback) {
    if (req.session.user === undefined) {
        res.redirect("/login")
    } else {
        callback();
    }
};

//redirect if visiting base site
app.get("/", function (req, res) {
    redirect_unauth(req, res, function () {
        res.redirect("/search");
    });
});

//login / register code
app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/login", urlencodedParser, function (req, res) {
   let username = req.body.username;
   let pw = req.body.password;

    if (username === "" || pw === "") {
        res.render("login", {message: "You must enter a Username and a password!", lastusername: username});
    } else {
        db.findUser(username, function (dbResRows) {
            if (dbResRows[0] === undefined) {
                res.render("login", {message: "User does not exist. You may sign up!", lastusername: username});
            } else {
                let userid = dbResRows[0].id;
                let passhash = dbResRows[0].passhash;
                db.comparePasswords(pw, passhash, function (result) {
                    if (result === false) {
                        res.render("login", {message: "Wrong password!!!", lastusername: username});
                    } else {
                        req.session.user = username;
                        req.session.userid = userid;
                        res.redirect("/search")
                    }
                });
            }
        });
    }
});

app.post("/register", urlencodedParser, function (req, res) {
    let username = req.body.username;
    let pw = req.body.password;
    let pw2 = req.body.confirmPassword;

    if (username === "" || pw === "") {
        res.render("register", {message: "You must enter a Username and a password!", lastusername: username});
    } else if (pw !== pw2) {
        res.render("register", {message: "Your password does not match with the confirmation.", lastusername: username});
    } else {
        db.findUser(username, function (dbResRows) {
            if (dbResRows[0] !== undefined) {
                res.render("register", {message: "That username is already taken. :(", lastusername: username});
            } else {
                db.addUser(username, pw, function () {
                    res.render("welcome", {user: username})
                });
            }
        });
    }
});

//logout
app.get("/logout", function (req, res) {
    req.session.user = undefined;
    req.session.userid = undefined;
    res.redirect("/login");
});

//Book search site
app.get("/search", urlencodedParser, function (req, res) {
    redirect_unauth(req, res, function () {
        res.render("search", {user: req.session.user});
    });
});

app.post("/search", urlencodedParser, function (req, res) {
    redirect_unauth(req, res, function () {
        let searchterm = req.body.searchterm;
        db.searchBooks(searchterm, function (dbResRows) {
            res.render("search", {user: req.session.user, books: dbResRows});
        });
    });
});

//Detailed book site
app.get("/book/:id", urlencodedParser, function (req, res) {
    redirect_unauth(req, res, function () {
        let bookid = req.params.id;
        db.getBookById(bookid, function (dbResBook) {
            db.getBookCriticsByBookId(bookid, function (dbResCritics, avgRating) {
                db.getBookPictureURLbyTitle(dbResBook.title, function (bookPicURL) {
                    res.render("detailed_view", {user: req.session.user, book: dbResBook, critics: dbResCritics, avgRating: avgRating, bookIMG: bookPicURL});
                });
            });
        });
    });
});

app.post("/book/:id", urlencodedParser, function (req, res) {
    redirect_unauth(req, res, function () {
        let bookid = req.params.id;
        db.setOrInsertBookCritic(bookid, req.session.userid, req.body.user_review, req.body.user_rating, function () {
            res.redirect("/book/" + bookid);
        });
    });
});

//start server
app.listen(PORT, function() {
    console.log(`Server running and listening on port ${PORT}`);
});