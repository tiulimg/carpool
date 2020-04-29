var mongodb = require("mongodb");
var Promise = require('promise');

var util = require("./util");

module.exports = {
    initialize: initialize,
    gethikers: gethikers,
    gethikes: gethikes,
    getlastregisters: getlastregisters,
    getironnumbers: getironnumbers,
    getroutes: getroutes,
}

var ObjectID = mongodb.ObjectID;

var HIKERS_COLLECTION = "hikers";
var HIKE_COLLECTION = "hike";
var LAST_REGISTER_COLLECTION = "last_register";
var IRONNUMBERS_COLLECTION = "ironnumbers";
var ROUTES_COLLECTION = "routes";

function initialize(app) {
    // Create a database variable outside of the database connection callback to reuse the connection pool in your app.
    var db;

    // Connect to the database before starting the application server.
    var mongoClient = new mongodb.MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017/test",{ useUnifiedTopology: true });
    mongoClient.connect(function (err, client) {
        if (err) {
            console.log(err);
            process.exit(1);
        }

        // Save database object from the callback for reuse.
        db = client.db();
        console.log("Database connection ready");

        // Initialize the app.
        var server = app.listen(process.env.PORT || 8080, function () {
            var port = server.address().port;
            console.log("App now running on port", port);
        });
    });
}

function gethikers() {
    return new Promise((resolve, reject) => {
        db.collection(HIKERS_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                return reject(res, err.message, "Failed to get hikers.");
            } else {
                return resolve(docs);
            }
        });
    });
}

function gethikes() {
    return new Promise((resolve, reject) => {
        db.collection(HIKE_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                return reject(res, err.message, "Failed to get hikes.");
            } else {
                docs = util.sort_hikes(docs, false);
                return resolve(docs);
            }
        });
    });
}

function getlastregisters() {
    return new Promise((resolve, reject) => {
        db.collection(LAST_REGISTER_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                return reject(res, err.message, "Failed to get hikers.");
            } else {
                return resolve(docs);
            }
        });
    });
}

function getironnumbers() {
    return new Promise((resolve, reject) => {
        db.collection(IRONNUMBERS_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                return reject(res, err.message, "Failed to get hikers.");
            } else {
                return resolve(docs);
            }
        });
    });
}

function getroutes() {
    return new Promise((resolve, reject) => {
        db.collection(ROUTES_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                return reject(res, err.message, "Failed to get routes.");
            } else {
                return resolve(docs);
            }
        });
    });
}