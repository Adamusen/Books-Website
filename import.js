let pg = require("pg");
let fs = require('fs');
let CsvReadableStream = require('csv-reader');

const conString = process.env.DB_CON_STRING;

if (conString === undefined) {
    console.log("ERROR: environment variable DB_CON_STRING not set.");
    process.exit(1);
}

//configure connection
pg.defaults.ssl = true;
let dbClient = new pg.Client(conString);
dbClient.connect();


//repair bad Strings for SQL
let repString = function(str) {
    return str.toString().split("\'").join("\'\'");
};

//delete preexisting tables function
//chained with next functions
let delBookTable = function() {
    dbClient.query("DROP TABLE ak_bk_books", function (dbError, dbResponse) {
        console.log("Deleted preexisting book table. Creating users Table...");
        createUsersTable();
    });
};

let createUsersTable = function() {
    let querystring = "CREATE TABLE ak_bk_users (" +
        "id SERIAL PRIMARY KEY, " +
        "username VARCHAR NOT NULL, " +
        "passhash VARCHAR NOT NULL)";
    dbClient.query(querystring, function (dbError, dbResponse) {
        console.log("Users table created. Creating book Table...");
        createBookTable();
    });
};

//create books table function
let createBookTable = function() {
    let querystring = "CREATE TABLE ak_bk_books (" +
        "id SERIAL PRIMARY KEY, " +
        "isbn VARCHAR NOT NULL, " +
        "title VARCHAR NOT NULL, " +
        "author VARCHAR NOT NULL, " +
        "year INTEGER NOT NULL)";
    dbClient.query(querystring, function (dbError, dbResponse) {
        console.log("Book table created. Creating critics table...");
        createCriticsTable();
    });
};

//create critics table
let createCriticsTable = function() {
    let querystring = "CREATE TABLE ak_bk_critics (" +
        "id SERIAL PRIMARY KEY, " +
        "book_id INTEGER NOT NULL, " +
        "user_id INTEGER NOT NULL, " +
        "critic VARCHAR NOT NULL, " +
        "rating INTEGER NOT NULL)";
    dbClient.query(querystring, function (dbError, dbResponse) {
        console.log("Critics table created. Inserting items into book table...");
        insertTableItems();
    });
};

//insert items into table
let insertTableItems = function() {
    let count = -1;
    let endedcount = 0;
    let inputStream = fs.createReadStream('books.csv', 'utf8');
    inputStream
        .pipe(CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
        .on('data', function (row) {
            count++;
            if (count > 0) {
                querystring = "INSERT INTO ak_bk_books (isbn, title, author, year) VALUES (\'" +
                    repString(row[0]) + "\', \'" +
                    repString(row[1]) + "\', \'" +
                    repString(row[2]) + "\', " +
                    row[3] + ")";
                //console.log(querystring);
                dbClient.query(querystring, function (dbError, dbResponse) {
                    endedcount++;
                    if (endedcount % 500 === 0) {
                        console.log("The database processed " + endedcount + " requests. Processing...");
                    }
                    if (count - endedcount === 0) {
                        console.log("Processing finished! Yay!!!");
                        dbClient.end();
                    }
                });
            }
        })
        .on('end', function (data) {
            console.log('Finished adding ' + count + ' items into query. Processing...');
        });
};

//Start process
delBookTable();