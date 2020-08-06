let pg = require("pg");
let bcrypt = require('bcrypt');
const saltRounds = 10;

//setup database connection
const conString = process.env.DB_CON_STRING;
if (conString === undefined) {
    console.log("ERROR: environment variable DB_CON_STRING not set.");
    process.exit(1);
}

pg.defaults.ssl = true;
let dbClient = new pg.Client(conString);
dbClient.connect();


//exported SQL databese functions
exports.findUser = function (username, callback) {
    dbClient.query("SELECT * FROM ak_bk_users WHERE username = \'" + username + "\';", function (dbError, dbResponse) {
        callback(dbResponse.rows);
    });
};

exports.addUser = function (username, password, callback) {
    bcrypt.hash(password, saltRounds, function (err, hash) {
        dbClient.query("INSERT INTO ak_bk_users (username, passhash) VALUES (\'" + username + "\', \'" + hash + "\');", function (dbError, dbResponse) {
            callback(dbError);
        });
    });
};

exports.comparePasswords = function (password, passhash, callback) {
    bcrypt.compare(password, passhash, function (err, result) {
        callback(result);
    });
};

exports.searchBooks = function (searchterm, callback) {
    let substr = " LIKE \'%" + searchterm + "%\' ";
    dbClient.query("SELECT * FROM ak_bk_books WHERE isbn" + substr + "OR title" + substr + "OR author" + substr, function (dbError, dbResponse) {
        callback(dbResponse.rows);
    });
};

exports.getBookById = function (bookid, callback) {
    dbClient.query("SELECT * FROM ak_bk_books WHERE id=" + bookid, function (dbError, dbResponse) {
        callback(dbResponse.rows[0]);
    });
};

exports.getBookCriticsByBookId = function (bookid, callback) {
    dbClient.query("SELECT username, critic, rating FROM ak_bk_critics JOIN ak_bk_users ON ak_bk_critics.user_id = ak_bk_users.id WHERE book_id=" + bookid, function (dbError, dbResponse) {
        let avgRating = 0;
        for (let i=0;i<dbResponse.rows.length;i++)
            avgRating += dbResponse.rows[i].rating;
        if (dbResponse.rows.length > 0)
            avgRating /= dbResponse.rows.length;
        callback(dbResponse.rows, avgRating);
    });
};

exports.setOrInsertBookCritic = function (bookid, userid, critic, rating, callback) {
    dbClient.query("UPDATE ak_bk_critics SET critic = \'" + critic + "\', rating = " + rating + " WHERE book_id = " + bookid + " AND user_id = " + userid, function (dbError, dbResponse) {
        if (dbResponse.rowCount === 0) {
            dbClient.query("INSERT INTO ak_bk_critics (book_id, user_id, critic, rating) VALUES (" + bookid + ", " + userid + ", \'" + critic + "\', " + rating + ")", function (dbError, dbResponse) {
                callback();
            });
        } else {
            callback();
        }
    });
};


//a function using google-books-search package to get a picture of a given book.
let books = require('google-books-search');
exports.getBookPictureURLbyTitle = function (bookTitle, callback) {
    books.search(bookTitle, function(error, results) {
        if ( ! error ) {
            callback(results[0].thumbnail);
        } else {
            console.log(error);
            callback(undefined);
        }
    });
};