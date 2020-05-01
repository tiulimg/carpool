var mongodb = require("mongodb");
var Promise = require('promise');

var util = require("./util");

module.exports = {
    initialize: initialize,
    gethikers: gethikers,
    gethikersbyhikedate: gethikersbyhikedate,
    gethikerbyhikedateandphonenumber: gethikerbyhikedateandphonenumber,
    gethikerswithdrivers: gethikerswithdrivers,
    getdriversforhike: getdriversforhike,
    updatehikerstatus: updatehikerstatus,
    updatehikerchoosedrivers: updatehikerchoosedrivers,
    replaceallhikers: replaceallhikers,
    replaceallhikersforhike: replaceallhikersforhike,
    gethikes: gethikes,
    replaceallhikes: replaceallhikes,
    getlastregisters: getlastregisters,
    getlastregisterbyphonenumber: getlastregisterbyphonenumber,
    insertnewlastregister: insertnewlastregister,
    replaceonelastregister: replaceonelastregister,
    deleteonelastregister: deleteonelastregister,
    deletealllastregisters: deletealllastregisters,
    getironnumbers: getironnumbers,
    updateironnumberbyphone: updateironnumberbyphone,
    getroutes: getroutes,
}

var ObjectID = mongodb.ObjectID;

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

var HIKERS_COLLECTION = "hikers";
var HIKE_COLLECTION = "hike";
var LAST_REGISTER_COLLECTION = "last_register";
var IRONNUMBERS_COLLECTION = "ironnumbers";
var ROUTES_COLLECTION = "routes";

function initialize(app) {
    return new Promise((resolve, reject) => {
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
                return resolve();
            });
        });
    });
}

function gethikers(res) {
    return new Promise((resolve, reject) => {
        db.collection(HIKERS_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get hikers.");
            } else {
                return resolve(docs);
            }
        });
    });
}

function gethikersbyhikedate(res, hiketodate) {
    return new Promise((resolve, reject) => {
        db.collection(HIKERS_COLLECTION).find(
            { $or: [ { hikenamehebrew: { $regex : ".*"+hiketodate+".*" } }, 
                     { hikenameenglish: { $regex : ".*"+hiketodate+".*" } } ] }).sort({hikerindex: 1}).toArray(function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get hikers.");
            } else {
                return resolve(docs);
            }
        });
    });
}

function gethikerbyhikedateandphonenumber(res, hiketodate, phonenumber) {
    return new Promise((resolve, reject) => {
        db.collection(HIKERS_COLLECTION).findOne(
            { $and: [ { $or: [ { hikenamehebrew: { $regex : ".*"+hiketodate+".*" } }, 
                               { hikenameenglish: { $regex : ".*"+hiketodate+".*" } } ] }, 
                      { $or: [ { phone: phonenumber }, { email: phonenumber } ] } ] }, function(err, doc) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get hikers.");
            } else {
                return resolve(doc);
            }
        });
    });
}

function gethikerswithdrivers(res) {
    return new Promise((resolve, reject) => {
        db.collection(HIKERS_COLLECTION).find(
                {$or: [{mydriverfrom: {$ne:null}}, {mydriverto: {$ne: null}}] }).toArray(function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get hikers.");
            } else {
                return resolve(docs);
            }
        });
    });
}

function getdriversforhike(res, hiketodate) {
    return new Promise((resolve, reject) => {
        db.collection(HIKERS_COLLECTION).find({ $and: [ 
            { $or: [ { hikenamehebrew: { $regex : ".*"+hiketodate+".*" } }, 
                     { hikenameenglish: { $regex : ".*"+hiketodate+".*" } } ] }, 
            { $or: [ { amidriver: true } ] } ] }).toArray(function(err, drivers) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get drivers.");
            } else {
                return resolve(drivers);
            }
        });
    });
}

function updatehikerstatus(res, hiketodate, phonenumber, status) {
    return new Promise((resolve, reject) => {
        db.collection(HIKERS_COLLECTION).update(
            { $and: [ { $or: [ { hikenamehebrew: { $regex : ".*"+hiketodate+".*" } }, 
                               { hikenameenglish: { $regex : ".*"+hiketodate+".*" } } ] }, 
                      { $or: [ { phone: phonenumber }, { email: phonenumber } ] } ] },
            { $set: {status: status } }
        );
    });
}

function updatehikerchoosedrivers(res, direction, chosendrivers) {
    return new Promise((resolve, reject) => {
        if (direction == "to") {
            db.collection(HIKERS_COLLECTION).update(
                { $and: [ { $or: [ { hikenamehebrew: { $regex : ".*"+hiketodate+".*" } }, 
                                   { hikenameenglish: { $regex : ".*"+hiketodate+".*" } } ] }, 
                          { $or: [ { phone: phonenumber }, { email: phonenumber } ] } ] },
                { $set: {chosendriversto: chosendrivers }}); 
        }
        else if (direction == "from") {
            db.collection(HIKERS_COLLECTION).update(
                { $and: [ { $or: [ { hikenamehebrew: { $regex : ".*"+hiketodate+".*" } }, 
                                   { hikenameenglish: { $regex : ".*"+hiketodate+".*" } } ] }, 
                          { $or: [ { phone: phonenumber }, { email: phonenumber } ] } ] },
                { $set: {chosendriversfrom: chosendrivers }}); 
        }
    });
}

function replaceallhikers(res, hikers) {
    return new Promise((resolve, reject) => {
        db.collection(HIKERS_COLLECTION).deleteMany({}, function(err, result) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to delete all hikers");
            }
            else if (hikers && hikers.length > 0) {
                db.collection(HIKERS_COLLECTION).insertMany(hikers, function(err, docs) {
                    if (err) {
                        logservices.handleError(res, err.message, "Failed to insert all hikers.");
                    } else {
                        return resolve(docs);
                    }
                });
            }
        });
    });
}

function replaceallhikersforhike(res, hiketodate, hikers) {
    return new Promise((resolve, reject) => {
        db.collection(HIKERS_COLLECTION).deleteMany({hikenamehebrew: { $regex : ".*"+hike.hikedate+".*" }}, function(err, result) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to delete hikers of " + hiketodate);
            } else {
                db.collection(HIKERS_COLLECTION).insertMany(hikers, function(err, docs) {
                    if (err) {
                        logservices.handleError(res, err.message, "Failed to insert all hikers of " + hiketodate);
                    }
                    else {
                        return resolve(docs);
                    }
                });
            }
        });
    });
}

function gethikes(res) {
    return new Promise((resolve, reject) => {
        db.collection(HIKE_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get hikes.");
            } else {
                docs = util.sort_hikes(docs, false);
                return resolve(docs);
            }
        });
    });
}

function replaceallhikes(res, hikes) {
    return new Promise((resolve, reject) => {
        db.collection(HIKE_COLLECTION).deleteMany({}, function(err, result) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to delete all hikes");
            }
            else if (hikes && hikes.length > 0) {
                db.collection(HIKE_COLLECTION).insertMany(hikes, function(err, docs) {
                    if (err) {
                        logservices.handleError(res, err.message, "Failed to insert all hikes.");
                    } else {
                        return resolve(docs);
                    }
                });
            }
        });
    });
}

function getlastregisters(res) {
    return new Promise((resolve, reject) => {
        db.collection(LAST_REGISTER_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get last registers.");
            } else {
                return resolve(docs);
            }
        });
    });
}

function getlastregisterbyphonenumber(res, phonenumber) {
    return new Promise((resolve, reject) => {
        db.collection(LAST_REGISTER_COLLECTION).findOne(
            { $or: [ { 'phone number': phonenumber }, { email: phonenumber } ]}
        ).toArray(function(err, doc) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get last register.");
            } else {
                return resolve(doc);
            }
        });
    });
}

function insertnewlastregister(res, lastregister) {
    return new Promise((resolve, reject) => {
        db.collection(LAST_REGISTER_COLLECTION).insertOne(lastregister, function(err, doc) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to create or update last register.");
            }
            else {
                resolve();
            }
        });
    });
}

function replaceonelastregister(res, phonenumber, lastregister) {
    return new Promise((resolve, reject) => {
        deleteonelastregister(phonenumber)
        .then(() => {
            db.collection(LAST_REGISTER_COLLECTION).insertOne(lastregister, function(err, doc) {
                if (err) {
                    logservices.handleError(res, err.message, "Failed to create or update last register.");
                }
                else {
                    return resolve(doc);
                }
            });
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    });
}

function deleteonelastregister(res, phonenumber) {
    return new Promise((resolve, reject) => {
        db.collection(LAST_REGISTER_COLLECTION).deleteOne(
            { $or: [ { 'phone number': phonenumber }, { email: phonenumber.toLowerCase() } ]}, function(err, doc) {

            if (err) {
                logservices.handleError(res, err.message, "Failed to delete lastregister");
            }
            resolve();
        });
    });
}

function deletealllastregisters(res) {
    return new Promise((resolve, reject) => {
        db.collection(LAST_REGISTER_COLLECTION).deleteMany({}, function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to delete last registers' details.");
            } else {
                resolve();
            }
        });
    });
}

function getironnumbers(res) {
    return new Promise((resolve, reject) => {
        db.collection(IRONNUMBERS_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get iron numbers.");
            } else {
                return resolve(docs);
            }
        });
    });
}

function updateironnumberbyphone(res, phonenumber, selectedhike) {
    return new Promise((resolve, reject) => {
        var now = new Date();
        db.collection(IRONNUMBERS_COLLECTION).updateOne(
            { phone: phonenumber },
            { 
                $set: {
                    hike: selectedhike, 
                    phone: phonenumber,
                    lastseen: now 
                }
            }, 
            { upsert : true });
        resolve();
    });
}

function getroutes(res) {
    return new Promise((resolve, reject) => {
        db.collection(ROUTES_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get routes.");
            } else {
                return resolve(docs);
            }
        });
    });
}