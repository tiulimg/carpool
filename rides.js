var Promise = require('promise');
var request = require('request');
var util = require('util');

var dbservices = require("./dbservices");
var logservices = require("./logservices");
var register = require("./register_to_hikes");
var tools = require("./tools");
var Queuemodule = require("./promisequeue");

module.exports = {
    patchridedetails: patchridedetails,
    translateaddresstolocation: translateaddresstolocation,
    findhikerslocation: findhikerslocation,
    findroutecachedb: findroutecachedb,
    bustohike: bustohike,
    carstohike: carstohike,
    updateavailableplaces: updateavailableplaces,
    hikeproperties: hikeproperties,
    setavailableplaces: setavailableplaces,
    setrequiredseats: setrequiredseats,
    setcarpool: setcarpool,
};

const HERE_APPID = process.env.HERE_APPID;
const ALGOLIA_KEY = process.env.ALGOLIA_KEY;
const ALGOLIA_APPID = process.env.ALGOLIA_APPID;

var locationscache = {};
var publictransportcache = {};
var carroutecache = {};

var fs = require('fs');
var stops = JSON.parse(fs.readFileSync('./stopsparser/meetingpoints.json', 'utf8'));

function patchridedetails(req, res, replies)
{
    var memory = req.body.conversation.memory;
    if (tools.checkpwd(res, memory.pwd)) {
        var language = tools.set_language(memory);
        dbservices.gethikes()
        .then(docs => {
            var nowstring = docs[0].lastupdate;
            var phonenumber = req.params.phone;
            phonenumber = tools.normalize_phonenumber(phonenumber);
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
                                        return reject("No geo location found " + address);
                                    }
                                }
                            });
                        }
                        else {
                            return reject("No geo location found " + address);
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
                    tools.wait(100*timer)
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
                    tools.wait(100*timer)
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
            return resolve(hikers);
        });
    });
}

function findroute(startlat,startlon,endlat,endlon,mode,arrivaltime,departtime,middlelat,middlelon,description) { // mode = car | publicTransport
    return new Promise((resolve, reject) => {
        var arrivaldepartaddition = "";
        if (arrivaltime) {
            arrivaldepartaddition = "&arrival="+arrivaltime;
        }
        else if (departtime) {
            arrivaldepartaddition = "&alternatives=9&departure="+departtime;
        }
        var walkRadius = "";
        if (mode == "publicTransportTimeTable") {
            walkRadius = "&walkRadius=6000";
        }
        var url = "https://route.ls.hereapi.com/routing/7.2/calculateroute.json?apiKey="+HERE_APPID;
        if (middlelat && middlelon) {
            url += "&waypoint0="+startlat+"%2C"+startlon+"&waypoint1="+middlelat+"%2C"+middlelon+"&waypoint2="+endlat+"%2C"+endlon + 
                "&mode=fastest%3B" + mode + "&combineChange=true&language=he&instructionformat=text" + 
                arrivaldepartaddition + walkRadius;
            // console.log("findroute here start ("+startlat+","+startlon+") middle ("+middlelat+","+middlelon+
            //     ") end ("+endlat+","+endlon+") arrival " + arrivaltime + " depart " + departtime + " mode " + mode + 
            //     " description " + description);
        }
        else {
            url += "&waypoint0="+startlat+"%2C"+startlon+"&waypoint1="+endlat+"%2C"+endlon + "&mode=fastest%3B" + mode +
                "&combineChange=true&language=he&instructionformat=text" + arrivaldepartaddition + walkRadius;
            // console.log("findroute here start ("+startlat+","+startlon+") end ("+endlat+","+endlon+") arrival " + arrivaltime + 
            //     " depart " + departtime + " mode " + mode + " description " + description);
        }
        console.log("url good " + url);
        request({
            url: url,
            method: "GET",
        }, function (error, response, body){
            if (error) {
                var rejection = "findroute Promise reject: " + error;
                console.log(rejection);
                return reject(rejection);
            }
            else
            {
                var responsebodyjson;
                try {
                    responsebodyjson = JSON.parse(response.body);
                } catch (error) {
                    console.log("url bad " + url);
                    console.log("body " + response.body);
                    logservices.logRejection(error);
                    return resolve("No route found");
                }
                //console.log("findroute here responsebodyjson " + JSON.stringify(responsebodyjson));
                if (responsebodyjson && responsebodyjson.subtype && responsebodyjson.subtype == "NoRouteFound") {
                    return resolve("No route found");
                }
                else if (responsebodyjson.response && responsebodyjson.response.route && responsebodyjson.response.route[0] &&
                    responsebodyjson.response.route[0].leg)
                {
                    var fastesttime = 1000000000000000;
                    var fastesttimeincludingwaiting = 1000000000000000;
                    var bestroute;
                    var distance;
                    var routedeparture;
                    for (let index = 0; index < responsebodyjson.response.route.length; index++) {
                        const route = responsebodyjson.response.route[index];
                        if (route.summary && route.summary.distance) {
                            if (route.summary.trafficTime && route.summary.trafficTime < fastesttime) {
                                fastesttime = route.summary.trafficTime;
                                distance = route.summary.distance;
                                routedeparture = route.summary.departure;
                                bestroute = route;
                            }
                            else if (route.summary.travelTime && route.summary.travelTime < fastesttime) {
                                fastesttime = route.summary.travelTime;
                                distance = route.summary.distance;
                                routedeparture = route.summary.departure;
                                bestroute = route;
                            }
                        }
                    }
                    if (routedeparture) {
                        var hikeday;
                        routedeparture = new Date(routedeparture).toISOString();
                        var arrivalafterroutedeparture = new Date(tools.addsecondstodate(routedeparture, fastesttime));
                        if (arrivaltime) {
                            fastesttimeincludingwaiting = tools.secondsbetweendates(arrivaltime, routedeparture);
                            hikeday = tools.getday(arrivaltime);
                        }
                        else {
                            fastesttimeincludingwaiting = tools.secondsbetweendates(departtime, arrivalafterroutedeparture);
                            hikeday = tools.getday(departtime);
                        }
                        var departday = tools.getday(routedeparture);
                        console.log("findroute routedeparture " + routedeparture + " + fastesttime " + fastesttime + 
                            " arrivalafterroutedeparture " + arrivalafterroutedeparture + " fastesttimeincludingwaiting " + 
                            fastesttimeincludingwaiting + " hikeday " + hikeday + " departday " + departday);
                        if (hikeday != departday) {
                            return resolve("No route found - only on " + departday + " to month");
                        }

                        if (fastesttime < fastesttimeincludingwaiting) {
                            fastesttime = fastesttimeincludingwaiting;
                        }
                    }

                    for (let indexleg = 0; indexleg < bestroute.leg.length; indexleg++) {
                        const leg = bestroute.leg[indexleg];
                        var maneuver = [];
                        for (let index = 0; index < leg.maneuver.length; index++) {
                            const step = leg.maneuver[index];
                            var instruction = step.instruction.replace(/<[^>]+>/g, '');
                            //console.log("instruction " + instruction);
                            maneuver.push({
                                position: step.position,
                                length: step.length,
                                traveltime: step.travelTime,
                                instruction: instruction,
                            });
                        }
                    }

                    var route = {
                        length: distance,
                        traveltime: fastesttime,
                        maneuver: maneuver,
                        startlat: startlat,
                        startlon: startlon,
                        endlat: endlat,
                        endlon: endlon,
                        middlelat: middlelat,
                        middlelon: middlelon,
                        mode: mode,
                        arrival: arrivaltime,
                        depart: departtime,
                        description: description,
                    };

                    return resolve(route);
                }
                else {
                    console.log("body " + response.body);
                    return resolve("No route found");
                }
            }
        });
    });
}

function findroutecachedb(res, startlat,startlon,endlat,endlon,mode,arrival,depart, middlelat, middlelon, description) { 
    return new Promise((resolve, reject) => {
        if (startlat == endlat && startlon == endlon) {
            return resolve({
                traveltime: 0
            });
        }
        arrivaldepart = arrival;
        if (depart) {
            arrivaldepart = depart;
        }
        var transportcachearray = publictransportcache;
        if (mode == "car") {
            transportcachearray = carroutecache;
        }
        var transportincachekey = mode+":"+startlat+","+startlon+":"+endlat+","+endlon+":"+arrivaldepart;
        if (middlelat) {
            transportincachekey = mode+":"+startlat+","+startlon+":"+middlelat+","+middlelon+":"+endlat+","+endlon+":"+arrivaldepart;
        }
        var transportincache = transportcachearray[transportincachekey];
        if (transportincache) {
            return resolve(transportincache);
        }
        else {
            dbservices.getroutebylatlontime(res, startlat, startlon, endlat, endlon, mode, arrival, depart, middlelat, middlelon)
            .then(routefromdb => {
                if (routefromdb) {
                    return resolve(routefromdb);
                }
                else {
                    findroute(
                        startlat, startlon, endlat, endlon, mode, arrival, depart, middlelat, middlelon, description)
                    .then(route => {
                        transportcachearray[transportincachekey] = route;
                        dbservices.insertnewroute(res, route)
                        .catch(rejection => {
                            logservices.logRejection(rejection);
                        });
                        return resolve(route);
                    })
                    .catch(rejection => {
                        logservices.logRejection(rejection);
                    })
                }
            })
            .catch(rejection => {
                logservices.logRejection(rejection);
            });
        }
    });
}

function bustohike(hitcherswithoutdrivers, hike, res) {
    return new Promise((resolve, reject) => {
        var promises = [];
        for (let index = 0; index < hike.hitchers.length; index++) {
            const hiker = hike.hitchers[index];
            if (hike.startlatitude && hike.endlatitude &&
                (hiker.needaride == "אני מגיע באוטובוס או אופנוע, אחר" ||
                 hiker.needaride == "I come in bus, a motorcycle or other" || hitcherswithoutdrivers)) {
                if (!hiker.mydriverto && !hiker.routetothehike && hiker.comesfromlocation) {
                    promises.push(
                        transporttohikebydirection(hiker, hike, "to", res, "publicTransportTimeTable")
                        .then(route => {
                            hiker.routetothehike = route;
                        })
                        .catch(rejection => {
                            logservices.logRejection(rejection);
                        })
                    );
                }
                if (!hiker.mydriverfrom && !hiker.routefromthehike && hiker.returnstolocation) {
                    promises.push(
                        transporttohikebydirection(hiker, hike, "from", res, "publicTransportTimeTable")
                        .then(route => {
                            hiker.routefromthehike = route;
                        })
                        .catch(rejection => {
                            logservices.logRejection(rejection);
                        })
                    );
                }
            }
        }
        Promise.all(promises).then(() => {
            return resolve();
        });
    });
}

function transporttohikebydirection(hiker, hike, direction, res, mode) {
    return new Promise((resolve, reject) => {
        var arrival = hike.starttime;
        var depart = null;
        var startlat;
        var startlon;
        var endlat = hike.startlatitude;
        var endlon = hike.startlongitude;
        if (direction == "to") {
            startlat = hiker.comesfromlocation.lat;
            startlon = hiker.comesfromlocation.lon;
        }
        if (direction == "from") {
            startlat = hike.endlatitude;
            startlon = hike.startlongitude;
            endlat = hiker.returnstolocation.lat;
            endlon = hiker.returnstolocation.lon;
            arrival = null;
            depart = hike.endtime;
        }
        var description = mode + " " + direction + " the hike " + hike.hikenamehebrew + " for hiker " + hiker.fullname + 
            " comesfrom " + hiker.comesfromdetailed + " returns to " + hiker.returnstodetailed;
        // console.log("transporttohikebydirection " + description);

        findroutecachedb(res, startlat, startlon, endlat, endlon, mode, arrival, depart, null, null, description)
        .then(route => {
            hiker["route"+direction+"thehike"] = route;
            return resolve(route);
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    });
}

function carstohike(hike, res) {
    return new Promise((resolve, reject) => {
        var promises = [];
        for (let index = 0; index < hike.drivers.length; index++) {
            const hiker = hike.drivers[index];

            if (hike.startlatitude && hike.endlatitude) {
                if (!hiker.routetothehike && hiker.comesfromlocation) {
                    promises.push(
                        transporttohikebydirection(hiker, hike, "to", res, "car")
                        .then(route => {
                            hiker.routetothehike = route;
                        })
                        .catch(rejection => {
                            logservices.logRejection(rejection);
                        })
                    );
                }
                if (!hiker.routefromthehike && hiker.returnstolocation) {
                    promises.push(
                        transporttohikebydirection(hiker, hike, "from", res, "car")
                        .then(route => {
                            hiker.routefromthehike = route;
                        })
                        .catch(rejection => {
                            logservices.logRejection(rejection);
                        })
                    );
                }
            }
        }
        Promise.all(promises).then(() => {
            return resolve();
        });
    });
}

function updateavailableplaces(hike) {
    for (let index = 0; index < hike.drivers.length; index++) {
        const hiker = hike.drivers[index];
        hiker.availableplaces = hiker.availableplacestothehike < hiker.availableplacesfromthehike ? 
            hiker.availableplacestothehike : hiker.availableplacesfromthehike;
    }
}

function canswitchhitchers(res, firsthitcher, firstdriver, secondhitcher, seconddriver, direction, hike) {
    return new Promise((resolve, reject) => {
        canhitcherreachdriver(res, firsthitcher, seconddriver, direction, hike)
        .then(canfirsthitcherswitch => {
            if (canfirsthitcherswitch) {
                canhitcherreachdriver(res, secondhitcher, firstdriver, direction, hike)
                .then(cansecondhitcherswitch => {
                    if (cansecondhitcherswitch) {
                        return resolve(checkavailableplacestoswitch(
                            firsthitcher, firstdriver, secondhitcher, seconddriver, direction));
                    }
                    else {
                        return resolve(false);
                    }
                })
                .catch(rejection => {
                    logservices.logRejection(rejection);
                });
            }
            else {
                return resolve(false);
            }
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    });
}

function checkavailableplacestoswitch(firsthitcher, firstdriver, secondhitcher, seconddriver, direction) {
    var firstdriveravailableplaces = firstdriver["availableplaces"+direction+"thehike"];
    var seconddriveravailableplaces = seconddriver["availableplaces"+direction+"thehike"];
    firstdriveravailableplaces += firsthitcher.myfriends.length;
    firstdriveravailableplaces -= secondhitcher.myfriends.length;
    seconddriveravailableplaces -= firsthitcher.myfriends.length;
    seconddriveravailableplaces += secondhitcher.myfriends.length;
    return (firstdriveravailableplaces > 0 && seconddriveravailableplaces > 0);
}

function canhitcherreachdriver(res, hiker, neardriver, direction, hike) {
    return new Promise((resolve, reject) => {
        var hikerloc;
        var driverloc;
        var arrival = null;
        var depart = null;
        if (neardriver["route"+direction+"thehike"] && neardriver["route"+direction+"thehike"].traveltime) {
            if (direction == "to") {
                hikerloc = hiker.comesfromlocation;
                driverloc = neardriver.comesfromlocation;
                arrival = tools.addsecondstodate(hike.starttime, - neardriver.routetothehike.traveltime);
                console.log("desired arrival to driver " + arrival);
            }
            else if (direction == "from") {
                hikerloc = hiker.returnstolocation;
                driverloc = neardriver.returnstolocation;
                depart = tools.addsecondstodate(hike.endtime, neardriver.routefromthehike.traveltime);
                console.log("desired depart from driver " + depart);
            }
            var description = "can " + hiker.fullname + " comesfrom " + hiker.comesfromdetailed + " returns to " + hiker.returnstodetailed + 
                " " + direction + " the hike " + hike.hikenamehebrew + " meet " + neardriver.fullname + 
                " comesfrom " + neardriver.comesfromdetailed + " returns to " + neardriver.returnstodetailed + 
                " in arrival " + arrival + " depart " + depart;
    
            findroutecachedb(res, hikerloc.lat, hikerloc.lon, driverloc.lat, driverloc.lon, "publicTransportTimeTable", arrival, depart, 
                null, null, description)
            .then(routetodriver => {
                console.log("routetodriver " + routetodriver + " " + routetodriver.traveltime + " drivertohike " + 
                    neardriver["route"+direction+"thehike"].traveltime + " hike.maximumpublictransporttime " + 
                    hike.maximumpublictransporttime);
                if (routetodriver.traveltime == 0 || routetodriver.traveltime) {
                    // (routetodriver.traveltime && 
                    //  (routetodriver.traveltime + neardriver["route"+direction+"thehike"].traveltime < hike.maximumpublictransporttime) ||
                    //   routetodriver.traveltime * 4 < neardriver["route"+direction+"thehike"].traveltime)) {
                    return resolve(true);
                }
                else {
                    var driverstops = stopsinthewaytohike(neardriver, hike, direction);
                    console.log("stopsinthewaytohike " + driverstops.length);
                    var stopsnearhitcher = tools.sortbyDistancesToStops(hiker, driverstops, direction);
                    neareststopfairdeviation(res, neardriver, stopsnearhitcher, direction, hike, hiker)
                    .then(driverandhitcherwouldstopat => {
                        if (driverandhitcherwouldstopat) {
                            console.log("stopsnearhitcher " + stopsnearhitcher.length + " driverandhitcherwouldstopat " + 
                                JSON.stringify(driverandhitcherwouldstopat));
                        }
                        if (driverandhitcherwouldstopat) {
                            hiker["stop"+direction+"thehike"] = driverandhitcherwouldstopat;
                            return resolve(true);
                        }
                        else {
                            return resolve(false);
                        }
                    })
                    .catch(rejection => {
                        logservices.logRejection(rejection);
                    });
                }
            })
            .catch(rejection => {
                logservices.logRejection(rejection);
            });
        }
        else {
            return resolve(false);
        }
    });
}

async function neareststopfairdeviation(res, driver, stops, direction, hike, hitcher) {
    for (let index = 0; index < stops.length; index++) {
        const stop = stops[index];
        var wouldstop = await woulddriverstop(res, driver, stop, direction, hike, hitcher);
        if (wouldstop) {
            return stop;
        }
    }
    return null;
}

function wouldhitchercometostop(res, hitcher, stop, direction, hike, arrival, depart, travaltimefromstop) {
    return new Promise((resolve, reject) => {
        var startlat;
        var startlon;
        var endlat = stop.lat;
        var endlon = stop.lon;
        if (direction == "to") {
            startlat = hitcher.comesfromlocation.lat;
            startlon = hitcher.comesfromlocation.lon;
        }
        else if (direction == "from") {
            startlat = stop.lat;
            startlon = stop.lon;
            endlat = hitcher.returnstolocation.lat;
            endlon = hitcher.returnstolocation.lon;
        }
        var description = "wouldhitchercometostop can " + hitcher.fullname + " comesfrom " + hitcher.comesfromdetailed + 
            " returns to " + hitcher.returnstodetailed + " " + direction + " the hike " + hike.hikenamehebrew + 
            " come to stop " + stop.name + " in arrival " + arrival + " depart " + depart;
        //console.log(description);

        findroutecachedb(res, startlat, startlon, endlat, endlon, "publicTransportTimeTable", arrival, depart, null, null, description)
        .then(routetostop => {
            console.log("wouldhitchercometostop routetostop " + routetostop + " " + routetostop.traveltime + " + travaltimefromstop " + 
                travaltimefromstop + " <? hike.maximumpublictransporttime " + hike.maximumpublictransporttime + 
                " description " + description);
            if (routetostop.traveltime || routetostop.traveltime == 0) {
                // if (routetostop.traveltime + travaltimefromstop <= hike.maximumpublictransporttime ||
                //     routetostop.traveltime * 4 < travaltimefromstop) {
                    stop.busroutetostoptime = routetostop.traveltime;
                    return resolve(true);
                // }
                // else {
                //     return resolve(false);
                // }
            }
            else {
                return resolve(false);
            }
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    });
}

function woulddriverstop(res, driver, stop, direction, hike, hitcher) {
    return new Promise((resolve, reject) => {
        var arrival = hike.starttime;
        var depart = null;
        var startlat;
        var startlon;
        var endlat = hike.startlatitude;
        var endlon = hike.startlongitude;
        if (direction == "to") {
            startlat = driver.comesfromlocation.lat;
            startlon = driver.comesfromlocation.lon;
        }
        else if (direction == "from") {
            startlat = hike.endlatitude;
            startlon = hike.startlongitude;
            endlat = driver.returnstolocation.lat;
            endlon = driver.returnstolocation.lon;
            arrival = null;
            depart = hike.endtime;
        }
        var description = "routethroughstop details " + driver.fullname + " comesfrom " + driver.comesfromdetailed + " returns to " + 
            driver.returnstodetailed + " " + direction + " the hike " + hike.hikenamehebrew + " stop " + stop.name + 
            " in arrival " + arrival + " depart " + depart;

        //console.log("woulddriverstop stop.lat " + stop.lat + " stop.lon " + stop.lon + " description " + description);
        findroutecachedb(res, startlat, startlon, endlat, endlon, "car", arrival, depart, stop.lat, stop.lon, description)
        .then(routethroughstop => {
            if (routethroughstop.traveltime) {
                var additionaltime = routethroughstop.traveltime - driver["route"+direction+"thehike"].traveltime;
                console.log("woulddriverstop routethroughstop.traveltime " + routethroughstop.traveltime + 
                    " - driver[route"+direction+"thehike].traveltime " + driver["route"+direction+"thehike"].traveltime + 
                    " = additionaltime " + additionaltime + " <? maximumcardeviation " + hike.maximumcardeviation + " description " +  
                    description + " stop " + stop.name);
                if (additionaltime < 0) {
                    additionaltime = 0;
                    driver["route"+direction+"thehike"] = routethroughstop;
                }
                if (additionaltime <= hike.maximumcardeviation) {
                    stop.caradditionaltime = additionaltime;
                    if (direction == "to") {
                        startlat = stop.lat;
                        startlon = stop.lon;
                    }
                    else if (direction == "from") {
                        endlat = stop.lat;
                        endlon = stop.lon;
                    }
                    description = "routefromstop details " + driver.fullname + " comesfrom " + driver.comesfromdetailed + 
                        " returns to " + driver.returnstodetailed + " " + direction + " the hike " + hike.hikenamehebrew + 
                        " stop " + stop.name + " in arrival " + arrival + " depart " + depart;
        
                    findroutecachedb(res, startlat, startlon, endlat, endlon, "car", arrival, depart, null, null, description)
                    .then(routefromstop => {
                        if (routefromstop.traveltime || routefromstop.traveltime == 0) {
                            var travaltimetostop = routethroughstop.traveltime - routefromstop.traveltime;
                            console.log("woulddriverstop routethroughstop.traveltime " + routethroughstop.traveltime + 
                                " - routefromstop.traveltime " + routefromstop.traveltime + " = travaltimetostop " + 
                                travaltimetostop + " description " + description);
                            if (travaltimetostop < 0) {
                                travaltimetostop = 0;
                            }

                            if (direction == "to") {
                                arrival = tools.addsecondstodate(arrival, - routefromstop.traveltime);
                            }
                            else if (direction == "from") {
                                depart = tools.addsecondstodate(depart, routefromstop.traveltime);
                            }
                            wouldhitchercometostop(res, hitcher, stop, direction, hike, arrival, depart, routefromstop.traveltime)
                            .then(hitcherwouldcome => {
                                return resolve(hitcherwouldcome);
                            })
                            .catch(rejection => {
                                logservices.logRejection(rejection);
                            });
                        }
                        else {
                            return resolve(false);
                        }
                    })
                    .catch(rejection => {
                        logservices.logRejection(rejection);
                    });
                }
                else {
                    return resolve(false);
                }
            }
            else {
                return resolve(false);
            }
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    });
}

function switchhitchers(firsthitcher, firstdriver, secondhitcher, seconddriver, direction) {
    firsthitcher["mydriver"+direction] = {
        name: seconddriver.name,
        fullname: seconddriver.fullname,
        phone: seconddriver.phone,
        drivercomesfrom: seconddriver.comesfrom,
        driverreturnsto: seconddriver.returnsto,
        link: seconddriver,
    };
    secondhitcher["mydriver"+direction] = {
        name: firstdriver.name,
        fullname: firstdriver.fullname,
        phone: firstdriver.phone,
        drivercomesfrom: firstdriver.comesfrom,
        driverreturnsto: firstdriver.returnsto,
        link: firstdriver,
    };

    for (let index = 0; index < firstdriver["myhitchers"+direction].length; index++) {
        const hitcher = firstdriver["myhitchers"+direction][index];
        if (hitcher.phone == firsthitcher.phone) {
            firstdriver["myhitchers"+direction].splice(index, 1);
            index--;
        }
    }
    for (let index = 0; index < seconddriver["myhitchers"+direction].length; index++) {
        const hitcher = seconddriver["myhitchers"+direction][index];
        if (hitcher.phone == secondhitcher.phone) {
            seconddriver["myhitchers"+direction].splice(index, 1);
            index--;
        }
    }

    firstdriver["myhitchers"+direction].push({
        "hitchername": secondhitcher.name,
        "hitcherfullname": secondhitcher.fullname,
        "hitcherphone": secondhitcher.phone,
        "hitchercomesfrom": secondhitcher.comesfrom,
        "hitcherreturnsto": secondhitcher.returnsto,
    });
    seconddriver["myhitchers"+direction].push({
        "hitchername": firsthitcher.name,
        "hitcherfullname": firsthitcher.fullname,
        "hitcherphone": firsthitcher.phone,
        "hitchercomesfrom": firsthitcher.comesfrom,
        "hitcherreturnsto": firsthitcher.returnsto,
    });


    firsthitcher["myfriendsdrivers"+direction] = [];
    secondhitcher["myfriendsdrivers"+direction] = [];
    for (let hitchhikerfriendindex = 0; 
        firsthitcher.myfriends != null && hitchhikerfriendindex < firsthitcher.myfriends.length; 
        hitchhikerfriendindex++) {
        const hitchhikerfriend = firsthitcher.myfriends[hitchhikerfriendindex];
        firsthitcher["myfriendsdrivers"+direction].push({
            "hitchername": hitchhikerfriend,
            "drivername": seconddriver.name,
            "driverfullname": seconddriver.fullname,
            "driverphone": seconddriver.phone,
            "drivercomesfrom": seconddriver.comesfrom,
            "driverreturnsto": seconddriver.returnsto,
        });
        seconddriver["myhitchers"+direction].push({
            "hitchername": hitchhikerfriend,
            "hitcherphone": firsthitcher.phone,
            "hitchercomesfrom": firsthitcher.comesfrom,
            "hitcherreturnsto": firsthitcher.returnsto,
        });
    }
    for (let hitchhikerfriendindex = 0; 
        secondhitcher.myfriends != null && hitchhikerfriendindex < secondhitcher.myfriends.length; 
        hitchhikerfriendindex++) {
        const hitchhikerfriend = secondhitcher.myfriends[hitchhikerfriendindex];
        secondhitcher["myfriendsdrivers"+direction].push({
            "hitchername": hitchhikerfriend,
            "drivername": firstdriver.name,
            "driverfullname": firstdriver.fullname,
            "driverphone": firstdriver.phone,
            "drivercomesfrom": firstdriver.comesfrom,
            "driverreturnsto": firstdriver.returnsto,
        });
        firstdriver["myhitchers"+direction].push({
            "hitchername": hitchhikerfriend,
            "hitcherphone": secondhitcher.phone,
            "hitchercomesfrom": secondhitcher.comesfrom,
            "hitcherreturnsto": secondhitcher.returnsto,
        });
    }
}

function removehitcherfromdriver(hitcher, driver, direction) {
    hitcher["mydriver" + direction] = null;
    for (let index = 0; index < driver["myhitchers"+direction].length; index++) {
        const currhitcher = driver["myhitchers"+direction][index];
        if (currhitcher.phone == hitcher.phone) {
            driver["myhitchers"+direction].splice(index, 1);
            index--;
        }
    }
    hitcher["myfriendsdrivers"+direction] = [];
}

function addhitchertodriver(hiker, neardriver, direction)
{
    neardriver["availableplaces"+direction+"thehike"]--;
    hiker["seatsrequired"+direction+"thehike"]--;
    hiker["mydriver"+direction] = {
        name: neardriver.name,
        fullname: neardriver.fullname,
        phone: neardriver.phone,
        drivercomesfrom: neardriver.comesfrom,
        driverreturnsto: neardriver.returnsto,
        link: neardriver,
    };
    neardriver["myhitchers"+direction].push({
        "hitchername": hiker.name,
        "hitcherfullname": hiker.fullname,
        "hitcherphone": hiker.phone,
        "hitchercomesfrom": hiker.comesfrom,
        "hitcherreturnsto": hiker.returnsto,
    });

    hiker["myfriendsdrivers"+direction] = [];
    for (let hitchhikerfriendindex = 0; 
        hiker.myfriends != null && hitchhikerfriendindex < hiker.myfriends.length; 
        hitchhikerfriendindex++) {
        const hitchhikerfriend = hiker.myfriends[hitchhikerfriendindex];
        hiker["myfriendsdrivers"+direction].push({
            "hitchername": hitchhikerfriend,
            "drivername": neardriver.name,
            "driverfullname": neardriver.fullname,
            "driverphone": neardriver.phone,
            "drivercomesfrom": neardriver.comesfrom,
            "driverreturnsto": neardriver.returnsto,
        });
        neardriver["myhitchers"+direction].push({
            "hitchername": hitchhikerfriend,
            "hitcherphone": hiker.phone,
            "hitchercomesfrom": hiker.comesfrom,
            "hitcherreturnsto": hiker.returnsto,
        });
        neardriver["availableplaces"+direction+"thehike"]--;
        hiker["seatsrequired"+direction+"thehike"]--;
    }
}

function hikeproperties(hike, hikers) {
    hike.drivers = [];
    hike.hitchers = [];
    for (let index = 0; index < hikers.length; index++) {
        const hiker = hikers[index];
        if (hiker.amidriver) {
            hike.drivers.push(hiker);
        }
        else {
            hike.hitchers.push(hiker);
        }
    }
    if (hike.startlatitude) {
        var hikestartenddistance = tools.distanceLatLons(
            hike.startlatitude, hike.startlongitude, hike.endlatitude, hike.endlongitude);
        hike.iscircular = hikestartenddistance < 500 ? true : false;
        hike.minimumcarstoleave = 0;
        if (!hike.iscircular) {
            hike.minimumcarstoleave = hike.drivers.length / 3;
        }
    }
    else {
        console.log("hike " + hike.hikenamehebrew + " no lat lon!");
    }
    if (hike.starttime) {
        var starttime = new Date(hike.starttime);
        var endtime = new Date(hike.endtime);
        hike.duration = (endtime - starttime) / 1000;
        hike.maximumpublictransporttime = hike.duration / 2;
    }
    hike.maximumcardeviation = 15 * 60;
}

function switchhitcherscannotreachdriver(res, hike) {
    return new Promise((resolve, reject) => {
        var promises = [];
        for (let indexhitcher = 0; indexhitcher < hike.hitchers.length; indexhitcher++) {
            const hitcher = hike.hitchers[indexhitcher];
            promises.push(
                switchhitcherscannotreachdriverbydirection(res, hitcher, "to", hike)
                .then(() => {
                    switchhitcherscannotreachdriverbydirection(res, hitcher, "from", hike);
                })
                .catch(rejection => {
                    logservices.logRejection(rejection);
                })
            );
        }
        Promise.all(promises).then(() => {
            return resolve();
        })
    });
}

function switchhitcherscannotreachdriverbydirection(res, hitcher, direction, hike) {
    return new Promise((resolve, reject) => {
        if (hitcher["mydriver"+direction]) {
            canhitcherreachdriver(res, hitcher, hitcher["mydriver"+direction].link, direction, hike)
            .then(canmeet => {
                if (!canmeet) {
                    var hadswitched = false;
                    var switchpromises = [];
                    for (let indexotherhitcher = 0; indexotherhitcher < hike.hitchers.length; indexotherhitcher++) {
                        const otherhitcher = hike.hitchers[indexotherhitcher];
                        if (otherhitcher["mydriver"+direction]) {
                            switchpromises.push(
                                canswitchhitchers(res, hitcher, hitcher["mydriver"+direction].link, 
                                    otherhitcher, otherhitcher["mydriver"+direction].link, direction, hike)
                                .then(canswitch => {
                                    if (canswitch) {
                                        hadswitched = true;
                                        switchhitchers(hitcher, hitcher["mydriver"+direction].link, 
                                            otherhitcher, otherhitcher["mydriver"+direction].link, direction);
                                        return resolve();
                                    }
                                })
                                .catch(rejection => {
                                    logservices.logRejection(rejection);
                                })
                            );
                        }
                    }
                    Promise.all(switchpromises).then(() => {
                        if (!hadswitched) {
                            hitcher.couldnotfindaride = true;
                            removehitcherfromdriver(hitcher, hitcher["mydriver"+direction].link, direction);
                            return resolve();
                        }
                    })
                }
                else {
                    return resolve();
                }
            })
            .catch(rejection => {
                logservices.logRejection(rejection);
            });
        }
        else {
            return resolve();
        }
    });
}

function stopsinthewaytohike(driver, hike, direction) {
    if (direction == "to") {
        if (driver.comesfromlocation && hike.startlatitude) {
            return stopsinrectangle(
                driver.comesfromlocation.lat, driver.comesfromlocation.lon, hike.startlatitude, hike.startlongitude
            );
        }
    }
    else if (direction == "from") {
        if (driver.returnstolocation && hike.startlatitude) {
            return stopsinrectangle(
                driver.returnstolocation.lat, driver.returnstolocation.lon, hike.endlatitude, hike.endlongitude
            );
        }
    }
    return null;
}

function stopsinrectangle(driverlat, driverlon, hikelat, hikelon) {
    var stopsinarea = [];
    for (let index = 0; index < stops.length; index++) {
        const stop = stops[index];
        var distance = tools.distanceLatLons(driverlat, driverlon, stop.lat, stop.lon);

        if ((((driverlat < stop.lat && stop.lat < hikelat) || (driverlat > stop.lat && stop.lat > hikelat)) &&
            ((driverlon < stop.lon && stop.lon < hikelon) || (driverlon > stop.lon && stop.lon > hikelon))) ||
            distance <= 5000) {
            stopsinarea.push({
                name: stop.name,
                lat: stop.lat,
                lon: stop.lon,
            });
        }
    }
    return stopsinarea;
}

async function hikercalculate(res, hike) {
    for (let index = 0; index < hike.hitchers.length; index++) {
        const hiker = hike.hitchers[index];
        if (hiker.seatsrequired > 0) {
            console.log("hikercalculate hiker: " + hiker.fullname + " isdriver " + hiker.amidriver + 
                        " seats " + hiker.seatsrequired + " availableplaces " + hiker.availableplaces + 
                        " comesfrom " + hiker.comesfromdetailed + " returnsto " + hiker.returnstodetailed + " drivers to from " +
                        hiker.mydriverto + " " + hiker.mydriverfrom + " route to from " + hiker.routetothehike + " " + 
                        hiker.routefromthehike);
            await driverifcanmeet(res, hiker, hike, "to");
            if (hiker.mydriverto) {
                await driverifcanmeet(res, hiker, hike, "from");
            }
            if (hiker.mydriverto && hiker.mydriverto.link && !hiker.mydriverfrom && !hiker.routefromthehike) {
                removehitcherfromdriver(hiker, hiker.mydriverto.link, "to");
            }
            else if (!hiker.mydriverto && hiker.mydriverfrom && hiker.mydriverfrom.link && !hiker.routetothehike) {
                removehitcherfromdriver(hiker, hiker.mydriverfrom.link, "from");
            }
        }
    }
}

function setavailableplaces(hike) {
    for (let index = 0; index < hike.drivers.length; index++) {
        const driver = hike.drivers[index];
        driver.availableplacestothehike = driver.availableplaces - driver.myhitchersto.length;
        driver.availableplacesfromthehike = driver.availableplaces - driver.myhitchersfrom.length;
    }
}

function setrequiredseats(hike) {
    for (let index = 0; index < hike.hitchers.length; index++) {
        const hitcher = hike.hitchers[index];
        hitcher.seatsrequiredtothehike = hitcher.seatsrequired;
        hitcher.seatsrequiredfromthehike = hitcher.seatsrequired;
    }
}

async function driverifcanmeet(res, hiker, hike, direction) {
    if (!hiker["mydriver"+direction] && !hiker["route"+direction+"thehike"] && hike.startlatitude) {
        var distances = tools.getDistancesBetweenHikers(hiker, hike.drivers, direction);
        for (let index = 0; index < distances[direction+"thehike"].length; index++) {
            const neardriverdistance = distances[direction+"thehike"][index];
            var neardriver = neardriverdistance.link;
            console.log("driverifcanmeet driver "+direction+" the hike: distance " + 
                neardriverdistance.distance + 
                " name " + neardriver.fullname + " isdriver " + neardriver.amidriver + " seats " + 
                neardriver.seatsrequired + " availableplaces " + neardriver.availableplaces + 
                " neardriver.availableplaces"+direction+"thehike " + neardriver["availableplaces"+direction+"thehike"] + 
                " comesfrom " + neardriver.comesfromdetailed + " returnsto " + 
                neardriver.returnstodetailed);
                if (neardriver["availableplaces"+direction+"thehike"] >= hiker["seatsrequired"+direction+"thehike"]) {
                    var canmeet = await canhitcherreachdriver(res, hiker, neardriver, direction, hike);
                    console.log("canmeet " + canmeet);
                    if (canmeet) {
                        addhitchertodriver(hiker, neardriver, direction);
                        break;
                    }
                }
        }
    }
}

async function setcarpool(res, nearhikes) {
    for (let index = 0; index < nearhikes.length; index++) {
        const hike = nearhikes[index];
        var hikers = await dbservices.gethikersbyhikedate(res, hike.hikedate);
        if (hikers && hikers.length > 0){
            console.log("start calculation for " + hike.hikenamehebrew);
            hikeproperties(hike, hikers);

            await findhikerslocation(hikers);
            setavailableplaces(hike);
            setrequiredseats(hike);

            // public transport for hikers that don't need a ride
            await bustohike(false, hike, res);
            
            await carstohike(hike, res);
            await hikercalculate(res, hike);
                
            updateavailableplaces(hike);
            logservices.logcalculationresult(hikers);

            // public transport for hikers that hadn't left with a ride
            await bustohike(true, hike, res);
                
            removerouteinstructions(hikers);
            await dbservices.replaceallhikersforhike(res, hike.hikedate, hikers);
        };
    }
}

function removerouteinstructions(hikers) {
    for (let index = 0; index < hikers.length; index++) {
        const hiker = hikers[index];
        delete hiker.routetothehike;
        delete hiker.routefromthehike;
    }
}