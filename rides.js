var Promise = require('promise');
var request = require('request');

var dbservices = require("./dbservices");
var logservices = require("./logservices");
var register = require("./register_to_hikes");
var util = require("./util");

module.exports = {
    patchridedetails: patchridedetails,
    translateaddresstolocation: translateaddresstolocation,
    findhikerslocation: findhikerslocation,
    calculateroute: calculateroute,
};

const HERE_APPID = process.env.HERE_APPID;
const ALGOLIA_KEY = process.env.ALGOLIA_KEY;
const ALGOLIA_APPID = process.env.ALGOLIA_APPID;

var locationscache = {};

function patchridedetails(req, res, replies)
{
    var memory = req.body.conversation.memory;
    if (util.checkpwd(res, memory.pwd)) {
        var language = util.set_language(memory);
        dbservices.gethikes()
        .then(docs => {
            var nowstring = docs[0].lastupdate;
            var phonenumber = req.params.phone;
            phonenumber = util.normalize_phonenumber(phonenumber);
            var selectedhike = memory.selectedhike;
            var hiketodate = selectedhike.match(/\d{1,2}\.\d{1,2}\.\d{2}/g)[0];
            console.log("hiketodate " + hiketodate);

            dbservices.gethikerbyhikedateandphonenumber(hiketodate, phonenumber)
            .then(doc => {
                var recast_conversation_reply;
                var hadexchangednumbers = false;
                
                if (typeof(doc) === 'undefined' || doc == null) {
                    recast_conversation_reply = 
                        replies.get_recast_reply("HIKER_NOT_REGISTERED_SPECIFIC_HIKE",language,[nowstring, selectedhike],memory);    
                    res.status(200).json(recast_conversation_reply);
                } 
                else
                {
                    dbservices.getlastregisterbyphonenumber(phonenumber)
                    .then(doclast => {
                        if (typeof(doclast) !== 'undefined' && doc != doclast && 
                            typeof(doclast.password) !== 'undefined') {
                            console.log('doc.userpassword ' + doc.userpassword + ' memory.password ' + memory.password + 
                                ' last.password ' + doclast.password);
                            if (doc.userpassword != memory.password && doclast.password != memory.password) {
                                delete memory.password;
                                recast_conversation_reply = 
                                    replies.get_recast_reply("PASSWORD_INCORRECT_TRYEDIT",language,null,memory);   
                            }
                            else    
                            {
                                if (doc.amidriver)
                                {
                                    var hitchersto = gethitcherstext(language, doc.myhitchersto);
                                    var hitchersfrom = gethitcherstext(language, doc.myhitchersfrom);

                                    var reply_key = "NO_HITCHHIKERS";
                                    var reply_vars = [];
                                    if ((doc.myhitchersto == null || doc.myhitchersto.length == 0) &&
                                        (doc.myhitchersfrom == null || doc.myhitchersfrom.length == 0))
                                    {
                                        reply_vars.push(nowstring);
                                    }
                                    else if (JSON.stringify(doc.myhitchersto) == JSON.stringify(doc.myhitchersfrom))
                                    {
                                        reply_key = "HITCHHIKERS_BACK_FORTH";
                                        reply_vars.push(hitchersto);
                                    }
                                    else if (doc.myhitchersto != null && doc.myhitchersfrom != null)
                                    {
                                        reply_key = "HITCHHIKERS_DIFFERENT_BACK_FORTH";
                                        reply_vars.push(hitchersto);
                                        reply_vars.push(hitchersfrom);
                                    }
                                    else if (doc.myhitchersto != null)
                                    {
                                        reply_key = "HITCHHIKERS_FORTH";
                                        reply_vars.push(hitchersto);
                                    }
                                    else
                                    {
                                        reply_key = "HITCHHIKERS_BACK";
                                        reply_vars.push(hitchersfrom);
                                    }
                                    recast_conversation_reply = 
                                        replies.get_recast_reply(reply_key,language,reply_vars,memory); 
                                }
                                else
                                {
                                    if ((doc.mydriverto == null || doc.mydriverto.length == 0) &&
                                        (doc.mydriverfrom == null || doc.mydriverfrom.length == 0))
                                    {
                                        recast_conversation_reply = 
                                            replies.get_recast_reply("NO_RIDE",language,[nowstring],memory);
                                    }
                                    else if (JSON.stringify(doc.mydriverto) == JSON.stringify(doc.mydriverfrom))
                                    {
                                        recast_conversation_reply = 
                                            replies.get_recast_reply("RIDE_BACK_FORTH",language,
                                            [doc.mydriverto.name,
                                            doc.mydriverto.phone,
                                            doc.mydriverto.drivercomesfrom,
                                            doc.mydriverto.driverreturnsto],memory);
                                        hadexchangednumbers = true; 
                                    }
                                    else if (doc.mydriverto != null && doc.mydriverfrom != null)
                                    {
                                        recast_conversation_reply = 
                                            replies.get_recast_reply("RIDE_DIFFERENT_BACK_FORTH",language,
                                            [doc.mydriverto.name,
                                            doc.mydriverto.phone,
                                            doc.mydriverto.drivercomesfrom,
                                            doc.mydriverto.driverreturnsto,
                                            doc.mydriverfrom.name,
                                            doc.mydriverfrom.phone,
                                            doc.mydriverfrom.drivercomesfrom,
                                            doc.mydriverfrom.driverreturnsto,
                                            doc.mydriverto.name],memory);
                                        hadexchangednumbers = true;
                                    }
                                    else if (doc.mydriverto != null)
                                    {
                                        recast_conversation_reply = 
                                            replies.get_recast_reply("RIDE_FORTH",language,
                                            [doc.mydriverto.name,
                                            doc.mydriverto.phone,
                                            doc.mydriverto.drivercomesfrom,
                                            doc.mydriverto.driverreturnsto],memory);
                                        hadexchangednumbers = true;
                                    }
                                    else
                                    {
                                        recast_conversation_reply = 
                                            replies.get_recast_reply("RIDE_BACK",language,
                                            [doc.mydriverfrom.name,
                                            doc.mydriverfrom.phone,
                                            doc.mydriverfrom.drivercomesfrom,
                                            doc.mydriverfrom.driverreturnsto],memory);
                                        hadexchangednumbers = true;
                                    }
                                    var text = "";

                                    if (JSON.stringify(doc.myfriendsdriversto) == JSON.stringify(doc.myfriendsdriversfrom)) {
                                        switch (language) {
                                            case "he":
                                                for (let i = 0; i < doc.myfriendsdriversto.length; i++) {
                                                    const currdriver = doc.myfriendsdriversto[i];
                                                    text = currdriver.hitchername + " יכול לבוא ולחזור עם " + 
                                                        currdriver.drivername + " " + currdriver.driverphone + ". הוא מגיע מ" +
                                                        currdriver.drivercomesfrom + " וחוזר ל" + currdriver.driverreturnsto;
                                                }    
                                                break;
                                            case "en":
                                                for (let i = 0; i < doc.myfriendsdriversto.length; i++) {
                                                    const currdriver = doc.myfriendsdriversto[i];
                                                    text = currdriver.hitchername + " can come and return with " + 
                                                        currdriver.drivername + " " + currdriver.driverphone + ". He comes from " +
                                                        currdriver.drivercomesfrom + " and returns to " + currdriver.driverreturnsto;
                                                }
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                    else if (doc.myfriendsdriversto != null && doc.myfriendsdriversfrom != null) {
                                        switch (language) {
                                            case "he":
                                                for (let i = 0; i < doc.myfriendsdriversto.length || i < doc.myfriendsdriversfrom.length; i++) {
                                                    const currdriverto = doc.myfriendsdriversto[i];
                                                    const currdriverfrom = doc.myfriendsdriversfrom[i];
                                                    text = currdriverto.hitchername + " יכול לבוא עם " + 
                                                        currdriverto.drivername + " " + currdriverto.driverphone + ". הוא מגיע מ" +
                                                        currdriverto.drivercomesfrom + " וחוזר ל" + currdriverto.driverreturnsto + ".\n" +
                                                        "ולחזור עם " + currdriverfrom.drivername + " " + currdriverfrom.driverphone + 
                                                        ". הוא מגיע מ" + currdriverfrom.drivercomesfrom + " וחוזר ל" + 
                                                        currdriverfrom.driverreturnsto;
                                                }
                                                break;
                                            case "en":
                                                for (let i = 0; i < doc.myfriendsdriversto.length || i < doc.myfriendsdriversfrom.length; i++) {
                                                    const currdriverto = doc.myfriendsdriversto[i];
                                                    const currdriverfrom = doc.myfriendsdriversfrom[i];
                                                    text = currdriverto.hitchername + " can come with " + 
                                                        currdriverto.drivername + " " + currdriverto.driverphone + ". He comes from " +
                                                        currdriverto.drivercomesfrom + " and returns to " + currdriverto.driverreturnsto + ".\n" +
                                                        "And return with " + currdriverfrom.drivername + " " + currdriverfrom.driverphone + 
                                                        ". He comes from " + currdriverfrom.drivercomesfrom + " and returns to " + 
                                                        currdriverfrom.driverreturnsto;
                                                }
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                    else if (doc.myfriendsdriversto != null) {
                                        switch (language) {
                                            case "he":
                                                for (let i = 0; i < doc.myfriendsdriversto.length; i++) {
                                                    const currdriver = doc.myfriendsdriversto[i];
                                                    text = currdriver.hitchername + " יכול לבוא בהלוך בלבד עם " + 
                                                        currdriver.drivername + " " + currdriver.driverphone + ". הוא מגיע מ" +
                                                        currdriver.drivercomesfrom + " וחוזר ל" + currdriver.driverreturnsto;
                                                }
                                                break;
                                            case "en":
                                                for (let i = 0; i < doc.myfriendsdriversto.length; i++) {
                                                    const currdriver = doc.myfriendsdriversto[i];
                                                    text = currdriver.hitchername + " can come with " + 
                                                        currdriver.drivername + " " + currdriver.driverphone + ". He comes from " +
                                                        currdriver.drivercomesfrom + " and returns to " + currdriver.driverreturnsto;
                                                }
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                    else 
                                    {
                                        switch (language) {
                                            case "he":
                                                for (let i = 0; i < doc.myfriendsdriversfrom.length; i++) {
                                                    const currdriver = doc.myfriendsdriversfrom[i];
                                                    text = currdriver.hitchername + " יכול לחזור בלבד עם " + 
                                                        currdriver.drivername + " " + currdriver.driverphone + ". הוא מגיע מ" +
                                                        currdriver.drivercomesfrom + " וחוזר ל" + currdriver.driverreturnsto;
                                                }    
                                                break;
                                            case "en":
                                                for (let i = 0; i < doc.myfriendsdriversfrom.length; i++) {
                                                    const currdriver = doc.myfriendsdriversfrom[i];
                                                    text = currdriver.hitchername + " can return with " + 
                                                        currdriver.drivername + " " + currdriver.driverphone + ". He comes from " +
                                                        currdriver.drivercomesfrom + " and returns to " + currdriver.driverreturnsto;
                                                }
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                    recast_conversation_reply = 
                                        replies.push_to_recast_reply(recast_conversation_reply,text);  
                                }
                            }
                            if (hadexchangednumbers) {
                                dbservices.updatehikerstatus(hiketodate, phonenumber, "hadexchangednumbers")
                                .catch(rejection => {
                                    logservices.logRejection(rejection);
                                });
                                register.updateCarpool(res);
                            }
                        }
                        res.status(200).json(recast_conversation_reply);
                    })
                    .catch(rejection => {
                        logservices.logRejection(rejection);
                    });
                }
            })
            .catch(rejection => {
                logservices.logRejection(rejection);
            });
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
}

function gethitcherstext(language, hitchers) {
    var hitcherstext = "";
    switch (language) {
        case "he":
            for (var i=0;hitchers != null && i<hitchers.length;i++)
            {
                hitcherstext += hitchers[i].hitchername + " " + hitchers[i].hitcherphone + 
                    " (מגיע מ" + hitchers[i].hitchercomesfrom + 
                    " וחוזר ל" + hitchers[i].hitcherreturnsto + ")\n";
            }
            break;
        case "en":
            for (var i=0;hitchers != null && i<hitchers.length;i++)
            {
                hitcherstext += hitchers[i].hitchername + " " + hitchers[i].hitcherphone + 
                    " (Comes from " + hitchers[i].hitchercomesfrom + 
                    " and returns to " + hitchers[i].hitcherreturnsto + ")\n";
            }
            break;
        default:
            break;
    }
    return hitcherstext;
}

function translateaddresstolocation(address) {
    return new Promise((resolve, reject) => {
        if (locationscache[address]) {
            console.log("got location from cache address " + address);
            return resolve(locationscache[address]);
        }
        else {
            var location;
            var url = "https://places-dsn.algolia.net/1/places/query";
            var headers = {
                'X-Algolia-Application-Id': ALGOLIA_APPID,
                'X-Algolia-API-Key': ALGOLIA_KEY, 
            }
            var requestbody = JSON.stringify({"query": address, "countries": "il"});
            console.log("translateaddresstolocation algolia address " + address + " request " + url);
            request({
                url: url,
                method: "POST",
                headers: headers,
                body: requestbody,
            }, function (error, response, body){
                if (error) {
                    var rejection = "translateaddresstolocation Promise reject: " + error;
                    console.log(rejection);
                    return reject(rejection);
                }
                else
                {
                    var responsebodyjson = JSON.parse(response.body);
                    //console.log("translateaddresstolocation algolia responsebodyjson " + JSON.stringify(responsebodyjson));
                    if (responsebodyjson.hits && responsebodyjson.hits[0] && responsebodyjson.hits[0]._geoloc) {
                        if (responsebodyjson.hits[0].locale_names && responsebodyjson.hits[0].locale_names.default &&
                            responsebodyjson.hits[0].locale_names.default[0]) {
                            locationname = responsebodyjson.hits[0].locale_names.default[0];
                        }
                        location = {
                            lat: responsebodyjson.hits[0]._geoloc.lat,
                            lon: responsebodyjson.hits[0]._geoloc.lng,
                            locationname: locationname,
                        }
                        locationscache[address] = location;
                        return resolve(location);
                    }
                    else {
                        var shortaddress = address;
                        var parenthesisindex = address.indexOf("(");
                        if (parenthesisindex != -1) {
                            shortaddress = address.substr(0, parenthesisindex);
                        }
                        var parenthesisindex = address.indexOf(")");
                        if (parenthesisindex != -1) {
                            shortaddress = shortaddress.substr(0, parenthesisindex);
                        }

                        if (address != shortaddress) {
                            var url = "https://places-dsn.algolia.net/1/places/query";
                            var headers = {
                                'X-Algolia-Application-Id': ALGOLIA_APPID,
                                'X-Algolia-API-Key': ALGOLIA_KEY, 
                            }
                            var requestbody = JSON.stringify({"query": shortaddress, "countries": "il"});
                            console.log("translateaddresstolocation algolia address " + shortaddress + " request " + url);
                            request({
                                url: url,
                                method: "POST",
                                headers: headers,
                                body: requestbody,
                            }, function (error, response, body){
                                if (error) {
                                    var rejection = "translateaddresstolocation Promise reject: " + error;
                                    console.log(rejection);
                                    return reject(rejection);
                                }
                                else
                                {
                                    var responsebodyjson = JSON.parse(response.body);
                                    //console.log("translateaddresstolocation algolia responsebodyjson " + JSON.stringify(responsebodyjson));
                                    if (responsebodyjson.hits && responsebodyjson.hits[0] && responsebodyjson.hits[0]._geoloc) {
                                        var locationname = null;
                                        if (responsebodyjson.hits[0].locale_names && responsebodyjson.hits[0].locale_names.default &&
                                            responsebodyjson.hits[0].locale_names.default[0]) {
                                            locationname = responsebodyjson.hits[0].locale_names.default[0];
                                        }
                                        location = {
                                            lat: responsebodyjson.hits[0]._geoloc.lat,
                                            lon: responsebodyjson.hits[0]._geoloc.lng,
                                            locationname: locationname,
                                        }
                                        locationscache[address] = location;
                                        return resolve(location);
                                    }
                                    else {
                                        reject("No geo location found " + address);
                                    }
                                }
                            });
                        }
                        else {
                            reject("No geo location found " + address);
                        }
                    }
                    //console.log("translateaddresstolocation algolia location " + JSON.stringify(location));
                }
            });
        }
    });
}

function findhikerslocation(hikers) {
    return new Promise((resolve, reject) => {
        var timer = 0;
        var promises = [];
        for (let hikerindex = 0; hikerindex < hikers.length; hikerindex++) {
            const hiker = hikers[hikerindex];
            if (!hiker.comesfromlocation) {
                promises.push(
                    util.wait(30*timer)
                    .then(() => {
                        return translateaddresstolocation(hiker.comesfromdetailed);
                    })
                    .then(comesfromlocation => {
                        console.log("comesfromlocation " + JSON.stringify(comesfromlocation) + " link " +
                            "https://www.google.com/maps?z=12&t=m&q="+
                            comesfromlocation.lat+","+comesfromlocation.lon);
                        hiker.comesfromlocation = comesfromlocation;
                    })
                    .catch(rejection => {
                        logservices.logRejection(rejection);
                    })
                );
            }
            if (!hiker.returnstolocation) {
                promises.push(
                    util.wait(30*timer)
                    .then(() => {
                        return translateaddresstolocation(hiker.returnstodetailed);
                    })
                    .then(returnstolocation => {
                        console.log("returnstolocation " + JSON.stringify(returnstolocation) + " link " +
                            "https://www.google.com/maps?z=12&t=m&q="+
                            returnstolocation.lat+","+returnstolocation.lon);
                        hiker.returnstolocation = returnstolocation;
                    })
                    .catch(rejection => {
                        logservices.logRejection(rejection);
                    })
                );
            }

            timer++;
        }
        Promise.all(promises).then(() => {
            resolve(hikers);
        });
    });
}

function calculateroute(startlat,startlon,endlat,endlon,mode,arrivaltime,departtime) { // mode = car | publicTransport
    return new Promise((resolve, reject) => {
        var arrivaldepartaddition = "";
        if (arrivaltime) {
            arrivaldepartaddition = "&arrival="+arrivaltime;
        }
        else if (departtime) {
            arrivaldepartaddition = "&depart="+departtime;
        }
        var url = "https://route.ls.hereapi.com/routing/7.2/calculateroute.json?apiKey="+HERE_APPID+
            "&waypoint0="+startlat+"%2C"+startlon+"&waypoint1="+endlat+"%2C"+endlon + "&mode=fastest%3B" + mode +
            "&combineChange=true&language=he" + arrivaldepartaddition;
        console.log("calculatecarroute here start ("+startlat+","+startlon+") end ("+endlat+","+endlon+") arrival " + arrivaltime + 
            " depart " + departtime + " mode " + mode);
        console.log("url " + url);
        request({
            url: url,
            method: "GET",
        }, function (error, response, body){
            if (error) {
                var rejection = "calculatecarroute Promise reject: " + error;
                console.log(rejection);
                return reject(rejection);
            }
            else
            {
                var responsebodyjson = JSON.parse(response.body);
                console.log("responsebodyjson " + JSON.stringify(responsebodyjson));
                //console.log("calculatecarroute here responsebodyjson " + JSON.stringify(responsebodyjson));
                if (responsebodyjson && responsebodyjson.subtype && responsebodyjson.subtype == "NoRouteFound") {
                    return reject("No route found");
                }
                else if (responsebodyjson.response && responsebodyjson.response.route && responsebodyjson.response.route[0] &&
                    responsebodyjson.response.route[0].leg && responsebodyjson.response.route[0].leg[0])
                {
                    var leg = responsebodyjson.response.route[0].leg[0];
                    var maneuver = [];
                    for (let index = 0; index < leg.maneuver.length; index++) {
                        const step = leg.maneuver[index];
                        var instruction = step.instruction.replace(/<[^>]+>/g, '');
                        console.log("instruction " + instruction);
                        maneuver.push({
                            position: step.position,
                            length: step.length,
                            traveltime: step.travelTime,
                            instruction: instruction,
                        });
                    }
                    var route = {
                        length: leg.length,
                        traveltime: leg.travelTime,
                        maneuver: maneuver,
                    };
                    return resolve(route);
                }
                else {
                    return reject("No route found");
                }
            }
        });
    });
}