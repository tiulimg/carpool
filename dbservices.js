var mongodb = require("mongodb");
var Promise = require('promise');

var tools = require("./tools");
var logservices = require("./logservices");

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
    getroutebylatlontime: getroutebylatlontime,
    insertnewroute: insertnewroute,
    deleteallroutes: deleteallroutes,
    getallconversationids: getallconversationids,
    getconversationid: getconversationid,
    replaceconversationid: replaceconversationid,
    deleteoneconversationid: deleteoneconversationid,
    savehistorylength: savehistorylength,
    deletehistorylength: deletehistorylength,
    gethistorylength: gethistorylength,
    replaceafterhikematch: replaceafterhikematch,
    deleteoneafterhikematch: deleteoneafterhikematch,
    deleteallafterhikematch: deleteallafterhikematch,
    findafterhikematch: findafterhikematch,
}

var ObjectID = mongodb.ObjectID;

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

var HIKERS_COLLECTION = "hikers";
var HIKE_COLLECTION = "hike";
var LAST_REGISTER_COLLECTION = "last_register";
var IRONNUMBERS_COLLECTION = "ironnumbers";
var ROUTES_COLLECTION = "routes";
var CONVERSATIONID_COLLECTION = "conversationid";
var HISTORY_COLLECTION = "history";
var AFTERHIKEMATCH_COLLECTION = "afterhikematch";

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

function gethikers(res, includemaybe) {
    return new Promise((resolve, reject) => {
        var filter = {};
        if (!includemaybe) {
            filter.maybecoming = false;
        }
        db.collection(HIKERS_COLLECTION).find(filter).toArray(function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get hikers.");
            } else {
                return resolve(docs);
            }
        });
    });
}

function gethikersbyhikedate(res, hiketodate, includemaybe) {
    return new Promise((resolve, reject) => {
        db.collection(HIKERS_COLLECTION).find({ $and: [ { maybecoming: includemaybe }, 
            { $or: [ { hikenamehebrew: { $regex : ".*"+hiketodate+".*" } }, 
                     { hikenameenglish: { $regex : ".*"+hiketodate+".*" } } ] } ] }).sort({hikerindex: 1}).toArray(function(err, docs) {
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

function getdriversforhike(res, hiketodate, includemaybe) {
    return new Promise((resolve, reject) => {
        db.collection(HIKERS_COLLECTION).find({ $and: [ { maybecoming: includemaybe },
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
        var elementtoupdate = {};
        elementtoupdate["chosendrivers"+direction] = chosendrivers;
        db.collection(HIKERS_COLLECTION).update(
            { $and: [ { $or: [ { hikenamehebrew: { $regex : ".*"+hiketodate+".*" } }, 
                               { hikenameenglish: { $regex : ".*"+hiketodate+".*" } } ] }, 
                      { $or: [ { phone: phonenumber }, { email: phonenumber } ] } ] },
            { $set: elementtoupdate});
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
            else {
                return resolve(null);
            }
        });
    });
}

function replaceallhikersforhike(res, hiketodate, hikers) {
    return new Promise((resolve, reject) => {
        db.collection(HIKERS_COLLECTION).deleteMany({hikenamehebrew: { $regex : ".*"+hiketodate+".*" }}, function(err, result) {
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
                docs = tools.sort_hikes(docs, false);
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
            else {
                return resolve([]);
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
            { $or: [ { 'phone number': phonenumber }, { email: phonenumber } ]}, function(err, doc) {
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
                return resolve();
            }
        });
    });
}

function replaceonelastregister(res, phonenumber, lastregister) {
    return new Promise((resolve, reject) => {
        deleteonelastregister(res, phonenumber)
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
            return resolve();
        });
    });
}

function deletealllastregisters(res) {
    return new Promise((resolve, reject) => {
        db.collection(LAST_REGISTER_COLLECTION).deleteMany({}, function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to delete last registers' details.");
            } else {
                return resolve();
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
            { upsert : true }
        );
        return resolve();
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

function getroutebylatlontime(res, startlat, startlon, endlat, endlon, mode, arrival, depart, middlelat, middlelon) {
    return new Promise((resolve, reject) => {
        var filter = [ { startlat: startlat }, { startlon: startlon }, { endlat: endlat }, { endlon: endlon },
            { mode: mode } ];
        if (arrival) {
            filter.push({arrival: arrival});
        }
        else if (depart) {
            filter.push({depart: depart});
        }
        if (middlelat && middlelon) {
            filter.push({middlelat: middlelat});
            filter.push({middlelon: middlelon});
        }
        db.collection(ROUTES_COLLECTION).findOne(
            { $and: filter }, function(err, doc) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get route.");
            } else {
                return resolve(doc);
            }
        }); 
    });
}

function insertnewroute(res, route) {
    return new Promise((resolve, reject) => {
        getroutebylatlontime(res, route.startlat, route.startlon, route.endlat, route.endlon, route.mode, route.arrival, route.depart,
            route.middlelat, route.middlelon)
        .then(foundroute => {
            if (!foundroute) {
                db.collection(ROUTES_COLLECTION).insertOne(route, function(err, doc) {
                    if (err) {
                        logservices.handleError(res, err.message, "Failed to create or update route.");
                    }
                    else {
                        return resolve();
                    }
                });
            }
            else {
                return resolve();
            }
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    });
}

function deleteallroutes(res) {
    return new Promise((resolve, reject) => {
        db.collection(ROUTES_COLLECTION).deleteMany({}, function(err, result) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to delete all routes");
            } else {
                return resolve();
            }
        });
    });
}

function getallconversationids(res) {
    return new Promise((resolve, reject) => {
        db.collection(CONVERSATIONID_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get conversationids.");
            } else {
                return resolve(docs);
            }
        });
    });
}

function getconversationid(res, phonenumber, conversationid) {
    return new Promise((resolve, reject) => {
        var filter = [];
        if (phonenumber) {
            filter.push({
                phonenumber: phonenumber,
            });
        }
        else if (conversationid) {
            filter.push({
                conversationid: conversationid,
            });
        }

        if (filter.length == 0) {
            return resolve(null);
        }
        else {
            db.collection(CONVERSATIONID_COLLECTION).findOne({ $or: filter }, function(err, doc) {
                if (err) {
                    logservices.handleError(res, err.message, "Failed to get conversationid.");
                } else {
                    return resolve(doc);
                }
            });
        }
    });
}

function replaceconversationid(res, conversationid, phonenumber, conversation) {
    return new Promise((resolve, reject) => {
        deleteoneconversationid(res, phonenumber, conversationid)
        .then(() => {
            db.collection(CONVERSATIONID_COLLECTION).insertOne(conversation, function(err, result) {
                if (err) {
                    logservices.handleError(res, err.message, "Failed to replace conversationid.");
                } else {
                    return resolve();
                }
            });
        })
    });
}

function deleteoneconversationid(res, phonenumber, conversationid) {
    return new Promise((resolve, reject) => {
        var filter = [];
        if (phonenumber) {
            filter.push({
                phonenumber: phonenumber,
            });
        }
        else if (conversationid) {
            filter.push({
                conversationid: conversationid,
            });
        }
        if (filter.length > 0) {
            db.collection(CONVERSATIONID_COLLECTION).deleteOne(
                { $or: filter}, function(err, doc) {
                if (err) {
                    logservices.handleError(res, err.message, "Failed to delete conversationid");
                }
                return resolve();
            });
        }
        else {
            return resolve();
        }
    });
}

function savehistorylength(res, historylength, currentlength, nextstart) {
    return new Promise((resolve, reject) => {
        deletehistorylength(res)
        .then(() => {
            length = {
                historylength: historylength, 
                currentlength: currentlength,
                nextstart: nextstart,
            }
            db.collection(HISTORY_COLLECTION).insertOne(length, function(err, doc) {
                if (err) {
                    logservices.handleError(res, err.message, "Failed to create history length.");
                }
                else {
                    return resolve();
                }
            });   
        })
    });
}

function deletehistorylength(res) {
    return new Promise((resolve, reject) => {
        db.collection(HISTORY_COLLECTION).deleteMany({}, function(err, doc) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to delete history length");
            }
            else {
                return resolve();
            }
        });
    });
}

function gethistorylength(res) {
    return new Promise((resolve, reject) => {
        db.collection(HISTORY_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to get history length.");
            } else {
                return resolve(docs);
            }
        });
    });
}

function replaceafterhikematch(res, afterhikeform) {
    return new Promise((resolve, reject) => {
        deleteoneafterhikematch(res, afterhikeform["whoami"])
        .then(() => {
            db.collection(AFTERHIKEMATCH_COLLECTION).insertOne(afterhikeform, function(err, doc) {
                if (err) {
                    logservices.handleError(res, err.message, "Failed to create or update after hike form.");
                }
                else {
                    return resolve();
                }
            });
        })
    });
}

function deleteoneafterhikematch(res, whoami) {
    return new Promise((resolve, reject) => {
        db.collection(AFTERHIKEMATCH_COLLECTION).deleteOne(
            { 'whoami': whoami }, function(err, doc) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to delete after hike match");
            }
            return resolve();
        });
    });
}

function deleteallafterhikematch(res) {
    return new Promise((resolve, reject) => {
        db.collection(AFTERHIKEMATCH_COLLECTION).deleteMany({}, function(err, doc) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to delete all after hike forms");
            }
            return resolve();
        });
    });
}

function findafterhikematch(res, afterhikerform) {
    return new Promise((resolve, reject) => {
        db.collection(AFTERHIKEMATCH_COLLECTION).find(
            { $and: [ { 'mymatches': afterhikerform["whoami"] }, 
                      { 'whoami': { $in: afterhikerform["mymatches"] } } ] }).toArray(function(err, docs) {
            if (err) {
                logservices.handleError(res, err.message, "Failed to find after hike match");
            }
            return resolve(docs);
        });
    });
}