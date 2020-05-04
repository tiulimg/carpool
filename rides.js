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
    findroute: findroute,
    findpublictransport: findpublictransport,
    findcarroute: findcarroute,
    makecalculation: makecalculation, 
    updateavailableplaces: updateavailableplaces,
    hikeproperties: hikeproperties,
};

const HERE_APPID = process.env.HERE_APPID;
const ALGOLIA_KEY = process.env.ALGOLIA_KEY;
const ALGOLIA_APPID = process.env.ALGOLIA_APPID;

var locationscache = {};
var publictransportcache = {};
var carroutecache = {};

var fs = require('fs');
var meetingpoints = JSON.parse(fs.readFileSync('./stopsparser/meetingpoints.json', 'utf8'));

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
                    util.wait(100*timer)
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
                    util.wait(100*timer)
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

function findroute(startlat,startlon,endlat,endlon,mode,arrivaltime,departtime) { // mode = car | publicTransport
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
                    return resolve("No route found");
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
                    return resolve("No route found");
                }
            }
        });
    });
}

function findroutecachedb(res, startlat,startlon,endlat,endlon,mode,arrival,depart) { // mode = car | publicTransport
    return new Promise((resolve, reject) => {
        arrivaldepart = arrival;
        if (depart) {
            arrivaldepart = depart;
        }
        var transportcachearray = publictransportcache;
        if (mode == "car") {
            transportcachearray = carroutecache;
        }
        var transportincachekey = mode+":"+startlat+","+startlon+":"+endlat+","+endlon+":"+arrivaldepart;
        var transportincache = transportcachearray[transportincachekey];
        if (transportincache) {
            // console.log("found in cache:\n" + JSON.stringify(transportincache));
            return resolve(transportincache);
        }
        else {
            dbservices.getroutebylatlontime(res, startlat, startlon, endlat, endlon, mode, arrival, depart)
            .then(routefromdb => {
                if (routefromdb) {
                    hiker["route"+direction+"thehike"] = routefromdb;
                    return resolve(routefromdb);
                }
                else {
                    findroute(
                        startlat, startlon, endlat, endlon, mode, arrival, depart)
                    .then(route => {
                        transportcachearray[transportincachekey] = route;
                        route.startlat = startlat;
                        route.startlon = startlon;
                        route.endlat = endlat;
                        route.endlon = endlon;
                        route.mode = mode;
                        route.arrival = arrival;
                        route.depart = depart;
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

function findpublictransport(hikers, alsohitcherswithoutdrivers, hike, res) {
    return new Promise((resolve, reject) => {
        var promises = [];
        for (let index = 0; index < hikers.length; index++) {
            const hiker = hikers[index];
            if (!hiker.amidriver && hike.startlatitude && hike.endlatitude &&
                (hiker.needaride == "אני מגיע באוטובוס או אופנוע, אחר" ||
                 hiker.needaride == "I come in bus, a motorcycle or other" || alsohitcherswithoutdrivers)) {
                if (!hiker.mydriverto && !hiker.routetothehike) {
                    promises.push(
                        transportbydirection(hiker, hike, "to", res, "publicTransport")
                        .catch(rejection => {
                            logservices.logRejection(rejection);
                        })
                    );
                }
                if (!hiker.mydriverfrom && !hiker.routefromthehike) {
                    promises.push(
                        transportbydirection(hiker, hike, "from", res, "publicTransport")
                        .catch(rejection => {
                            logservices.logRejection(rejection);
                        })
                    );
                }
            }
        }
        Promise.all(promises).then(() => {
            return resolve(hikers);
        });
    });
}

function transportbydirection(hiker, hike, direction, res, mode) {
    return new Promise((resolve, reject) => {
        console.log(mode + " " + direction + " the hike for hiker " + hiker.fullname);
        var arrival = hike.starttime;
        var depart = null;
        var startlat = hiker.comesfromlocation.lat;
        var startlon = hiker.comesfromlocation.lon;
        var endlat = hike.startlatitude;
        var endlon = hike.startlongitude;
        if (direction == "from") {
            startlat = hike.endlatitude;
            startlon = hike.startlongitude;
            endlat = hiker.returnstolocation.lat;
            endlon = hiker.returnstolocation.lon;
            arrival = null;
            depart = hike.endtime;
        }

        findroutecachedb(res, startlat, startlon, endlat, endlon, mode, arrival, depart)
        .then(route => {
            return resolve(route);
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    });
}

function findcarroute(hikers, hike, res) {
    return new Promise((resolve, reject) => {
        var promises = [];
        for (let index = 0; index < hikers.length; index++) {
            const hiker = hikers[index];
            if (hiker.amidriver && hike.startlatitude && hike.endlatitude) {
                if (!hiker.routetothehike) {
                    promises.push(
                        transportbydirection(hiker, hike, "to", res, "car")
                        .catch(rejection => {
                            logservices.logRejection(rejection);
                        })
                    );
                }
                if (!hiker.routefromthehike) {
                    promises.push(
                        transportbydirection(hiker, hike, "from", res, "car")
                        .catch(rejection => {
                            logservices.logRejection(rejection);
                        })
                    );
                }
            }
        }
        Promise.all(promises).then(() => {
            return resolve(hikers);
        });
    });
}

function makecalculation(hikers, distances, hike) {
    for (let index = 0; index < hikers.length; index++) {
        const hiker = hikers[index];
        console.log("calculaterides hiker: " + hiker.fullname + " isdriver " + hiker.amidriver + 
            " seats " + hiker.seatsrequired + " availableplaces " + hiker.availableplaces + 
            " comesfrom " + hiker.comesfromdetailed + " returnsto " + hiker.returnstodetailed);

        if (!hiker.amidriver && hiker.seatsrequired > 0) {
            calculateridesbydistanceanddirection(hiker, hike, distances, "to");
            calculateridesbydistanceanddirection(hiker, hike, distances, "from");
        }
    }

    for (let index = 0; index < hikers.length; index++) {
        const hiker = hikers[index];
        if (hiker.amidriver && 
            (hiker.needaride == "אני צריך טרמפ (אבל יש לי רכב)" ||
             hiker.needaride == "I need a ride but I do have a car")) {
            
        }
    }

    return hikers;
}

function updateavailableplaces(hikers) {
    for (let index = 0; index < hikers.length; index++) {
        const hiker = hikers[index];
        if (hiker.amidriver) {
            hiker.availableplaces = hiker.availableplacestothehike < hiker.availableplacesfromthehike ? 
                hiker.availableplacestothehike : hiker.availableplacesfromthehike;
        }
    }
}

function calculateridesbydistanceanddirection(hiker, hike, distances, direction) {
    if (!hiker["route"+direction+"thehike"] && hike.startlatitude) {
        for (let neardriverindex = 0; neardriverindex < distances[hiker.phone][direction+"thehike"].length; 
                neardriverindex++) {
            const neardriverdistance = distances[hiker.phone][direction+"thehike"][neardriverindex];
            var neardriver = neardriverdistance.link;
            console.log("calculaterides driver "+direction+" the hike: distance " + 
                neardriverdistance.distance + 
                " name " + neardriver.fullname + " isdriver " + neardriver.amidriver + " seats " + 
                neardriver.seatsrequired + " availableplaces " + neardriver.availableplaces + 
                " neardriver.availableplaces"+direction+"thehike " + neardriver["availableplaces"+direction+"thehike"] + 
                " comesfrom " + neardriver.comesfromdetailed + " returnsto " + 
                neardriver.returnstodetailed);
            if (neardriver.amidriver && 
                neardriver["availableplaces"+direction+"thehike"] >= hiker["seatsrequired"+direction+"thehike"]) {
                if (!hiker["mydriver"+direction]) {
                    neardriver["availableplaces"+direction+"thehike"]--;
                    hiker["seatsrequired"+direction+"thehike"]--;
                    hiker["mydriver"+direction] = {
                        name: neardriver.name,
                        fullname: neardriver.fullname,
                        phone: neardriver.phone,
                        drivercomesfrom: neardriver.comesfrom,
                        driverreturnsto: neardriver.returnsto,
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
                break;
            }
        }
    }
}

function hikeproperties(hike, hikers) {
    if (hike.startlatitude) {
        var hikestartenddistance = util.distanceLatLons(
            hike.startlatitude, hike.startlongitude, hike.endlatitude, hike.endlongitude);
        hike.iscircular = hikestartenddistance < 500 ? true : false;
        hike.minimumcarstoleave = 0;
        if (!hike.iscircular) {
            for (let index = 0; index < hikers.length; index++) {
                const hiker = hikers[index];
                if (hiker.amidriver) {
                    hike.minimumcarstoleave++;
                }
            }
            hike.minimumcarstoleave /= 3;
        }
    }
    if (hike.starttime) {
        var starttime = new Date(hike.starttime);
        var endtime = new Date(hike.endtime);
        hike.duration = endtime - starttime;
        hike.maximumpublictransporttime = hike.duration / 3;
    }
}