var Promise = require('promise');
var request = require('request');

var logservices = require("./logservices");

module.exports = {
    checkpwd: checkpwd,
    checkspecialpwd: checkspecialpwd,
    wait: wait,
    wakeupDyno: wakeupDyno,
    addsecondstodate: addsecondstodate,
    secondsbetweendates: secondsbetweendates,
    onlydate: onlydate,
    normalize_phonenumber: normalize_phonenumber,
    datestringtoobject: datestringtoobject,
    get_near_hikes: get_near_hikes, 
    remove_past_hikes: remove_past_hikes,
    remove_hikes_notinlist: remove_hikes_notinlist,
    only_hikes_in_lang: only_hikes_in_lang,
    sort_hikes: sort_hikes,
    findhike: findhike,
    set_language: set_language,
    friendstext_from_friendsdetails: friendstext_from_friendsdetails,
    toRadians: toRadians,
    distanceLatLons: distanceLatLons,
    getDistancesBetweenHikers: getDistancesBetweenHikers,
    sortbyDistancesToStops: sortbyDistancesToStops,
    getHikerAreas: getHikerAreas,
};

function checkpwd(res, pwd) {
    if (!pwd) {
        logservices.handleError(res, "Unauthorized", "Password is required.", 400);
    }
    else if (pwd != process.env.PSWD) {
        logservices.handleError(res, "Unauthorized", "Password is incorrect.", 400);
    }
    else {
        return true;
    }
    return false;
}

function checkspecialpwd(res, pwd, specialpwd) {
    if (!pwd || !specialpwd) {
        logservices.handleError(res, "Unauthorized", "Password and special password are required.", 400);
    }
    else if (pwd != process.env.PSWD || specialpwd != process.env.SPECIALPWD) {
        logservices.handleError(res, "Unauthorized", "Password or special password are incorrect.", 400);
    }
    else {
        return true;
    }
    return false;
}

function wait(ms)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}

function wakeupDyno(lock) {
    setTimeout(function() {
        request({
            url: "http://tiulimg-carpool.herokuapp.com/favicon.ico",
            method: "GET",
        }, function (error, response, body){
            var now = new Date();
            if (lock.stillrunning && (secondsbetweendates(lock.starttime, now) < 60 * 60)) {
                wakeupDyno(lock);
            }
        });
    }, 30 * 60 * 1000);
}

function addsecondstodate(datestring, seconds) {
    var dt = new Date(datestring);
    dt.setSeconds(dt.getSeconds() + seconds);
    //console.log("addsecondstodate source " + datestring + " seconds " + seconds + " result " + dt);
    return dt.toISOString();
}

function secondsbetweendates(date1, date2) {
    var t1 = new Date(date1);
    var t2 = new Date(date2);
    var dif = t1.getTime() - t2.getTime();

    var Seconds_from_T1_to_T2 = dif / 1000;
    var Seconds_Between_Dates = Math.abs(Seconds_from_T1_to_T2);
    return Seconds_Between_Dates;
}

function onlydate(datetimestring) {
    var d = new Date(datetimestring);
    d = d.toDateString();
    return d;
}

function normalize_phonenumber(phonenumber) {
    phonenumber = phonenumber.toLowerCase();
    if (phonenumber.indexOf("@") == -1) {
        phonenumber = phonenumber.replace(/-/g,"");
        if (phonenumber[0] != '0') {
            phonenumber = '0' + phonenumber;
        }    
    }
    if (phonenumber.indexOf("+972") != -1) {
        phonenumber = phonenumber.replace("+972","0");
    }
    return phonenumber;
}

function datestringtoobject(hikedate) {
    var hikedate = hikedate.match(/\d{1,2}\.\d{1,2}\.\d{2}/g);
    if (hikedate != null && hikedate.length > 0) {
        hikedate = hikedate[0];
        hikesplit = hikedate.split(".");
        return(Date.parse('20' + hikesplit[2] + '/' + hikesplit[1] + '/' + hikesplit[0]));
    }
    return null;
}

function only_hikes_in_lang(docs, hikelist, istext, lang) {
    if (istext) {
        for (let index = 0; index < hikelist.length; index++) {
            const hike = hikelist[index];
            docHike = findhike(docs, hike);

            if (index + 1 < hikelist.length) {
                var nexthike = hikelist[index + 1];
                if (nexthike == docHike.hikenamehebrew || nexthike == docHike.hikenameenglish) {
                    switch (lang) {
                        case "he":
                            hikelist.splice(index, 2, docHike.hikenamehebrew);
                            index--;
                            break;
                        case "en":
                            hikelist.splice(index, 2, docHike.hikenameenglish);
                            index--;
                            break;
                        default:
                            break;
                    }
                }
            }
        }

        for (let index = 0; index < hikelist.length; index++) {
            const hike = hikelist[index];
            docHike = findhike(docs, hike);

            switch (lang) {
                case "he":
                    if (docHike.hikenameenglish.indexOf(hike) != -1) {
                        hikelist.splice(index, 1, docHike.hikenamehebrew);
                    }
                    break;
                case "en":
                    if (docHike.hikenamehebrew.indexOf(hike) != -1) {
                        hikelist.splice(index, 1, docHike.hikenameenglish);
                    }
                    break;
                default:
                    break;
            }
        }
    }
    else {
        for (let index = 0; index < hikelist.length; index++) {
            const hike = hikelist[index];
            if (index + 1 < hikelist.length) {
                var nexthike = hikelist[index + 1];
                // console.log("only_hikes_in_lang hike " + JSON.stringify(hike) + " nexthike " + JSON.stringify(nexthike));
                if (hike.hikenamehebrew == nexthike.hikenamehebrew) {
                    hikelist.splice(index,1);
                    index--;
                }
            }
        }
    }
    return hikelist;
}

function get_near_hikes(hikes) {
    var now = new Date();
    var nearhikes = [];
    hikes = remove_past_hikes(hikes, false);
    hikes.forEach(hike => {
        var hikesplit = hike.hikedate.split(".");
        var hikestarttime = new Date('20' + hikesplit[2] + '/' + hikesplit[1] + '/' + hikesplit[0]);
        var days = 365;
        var dateOffset = (24*60*60*1000) * days;
        if (hikestarttime.getTime() - dateOffset < now.getTime()) {
            nearhikes.push(hike);
            console.log("nearhike " + hike.hikenamehebrew);
        }
    });
    return nearhikes;
}

function remove_past_hikes(hikelist, istext) {
    var today = new Date()
    if (istext) {
        for (let index = 0; index < hikelist.length; index++) {
            const hike = hikelist[index];
            var hikedate = datestringtoobject(hike);
            if (hikedate && today > hikedate) {
                hikelist.splice(index,1);
                index--;
            }
        }
    }
    else {
        for (let index = 0; index < hikelist.length; index++) {
            const hike = hikelist[index];
            hikedate = datestringtoobject(hike.hikedate);
            if (hikedate && today > hikedate) {
                hikelist.splice(index,1);
                index--;
            }
        }
    }
    return hikelist;
}

function remove_hikes_notinlist(hikelist, docs) {
    var hikelistcloned = JSON.parse(JSON.stringify(hikelist));
    for (let index = 0; index < hikelistcloned.length; index++) {
        var hike = hikelistcloned[index];
        var selectHike = null;
        var hikedate = hike.match(/\d{1,2}\.\d{1,2}\.\d{2}/g);
        if (hikedate != null) {
            selectHike = findhike(docs, hikedate[0]);
        }
        if (hike == "" || selectHike == null) {
            hikelistcloned.splice(index,1);
            index--;
        }
    }
    return hikelistcloned;
}

function sort_hikes(docs, istext) {
    if (istext) {
        docs.sort(function(b,a) {
            a = datestringtoobject(a);
            b = datestringtoobject(b);

            if (!a && !b) {
                return 0;
            }
            else if (!b) {
                return 1;
            }
            else if (!a) {
                return -1;
            }
            else {
                var result = a>b ? -1 : a<b ? 1 : 0;
                return result;
            }
        });
    }
    else {
        docs.sort(function(b,a){
            a = datestringtoobject(a.hikedate);
            b = datestringtoobject(b.hikedate);
            result = a>b ? -1 : a<b ? 1 : 0;
            return result;
        });
    }
    return docs;
}

function findhike(hikes, hikestring, hikealternatestring) {
    //console.log("hikes, hikestring, hikealternatestring: " + JSON.stringify(hikes), hikestring, hikealternatestring);
    selectHike = hikes.find(function(element) {
        var result = false;
        if ((element.hikenamehebrew && hikealternatestring && 
            element.hikenamehebrew.indexOf(hikealternatestring) != -1) ||
            (element.hikenamehebrew && 
            element.hikenamehebrew.indexOf(hikestring) != -1) ||
            (element.hikenameenglish && 
            element.hikenameenglish.indexOf(hikestring) != -1)) {
            result = true;
        }
        // console.log("findhike element.hikenamehebrew " + JSON.stringify(element.hikenamehebrew) + " " + result);
        return result;
    });
    return selectHike;
}

function set_language(memory) {
    var language = "he";
    if (memory.lang)
    {
        language = memory.lang;
    }
    if (language == "iw") {
        language = "he"
    }
    return language;
}

function friendstext_from_friendsdetails(friendsdetails) {
    var friends = "";
    if (friendsdetails) {
        for (let index = 0; index < friendsdetails.length; index++) {
            var friend = friendsdetails[index];
            if (friend.age) {
                friends += (index + 1) + ": " + friend.name + " - " + friend.age + ", " + friend.savesthedate + "\n";
            }
            else {
                friends += (index + 1) + ": " + friend.name + ", " + friend.savesthedate + "\n";
            }
        }
    }
    friends = friends.trim();
    return(friends);
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

function addmeterstolatlon(lat,lon,meters) {
    var earth = 6378.137,  //radius of the earth in kilometer
    pi = Math.PI,
    cos = Math.cos,
    m = (1 / ((2 * pi / 360) * earth)) / 1000;  //1 meter in degree

    var new_latitude = latitude + (meters * m);
    var new_longitude = longitude + (meters * m) / cos(latitude * (pi / 180));
    return {
        lat: new_latitude,
        lon: new_longitude,
    };
}

function distanceLatLons(lat1,lon1,lat2,lon2) {
    var d = 0;

    var R = 6371e3; // metres
    var φ1 = toRadians(lat1);
    var φ2 = toRadians(lat2);
    var Δφ = toRadians(lat2-lat1);
    var Δλ = toRadians(lon2-lon1);

    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    d = R * c;
    return d;
}

function getDistancesBetweenHikers(hiker, drivers, direction) {
    var distances = {
        link: hiker,
    };
    distances[direction+"thehike"] = [];

    for (let indexpartner = 0; indexpartner < drivers.length; indexpartner++) {
        const partner = drivers[indexpartner];
        if (hiker == partner || hiker.phone == partner.phone) {
            continue;
        }
        else if (!partner.amidriver) {
            continue;
        }
        else if (partner.availableplaces == 0 || hiker.availableplaces == 0) {
            continue;
        }

        switch (direction) {
            case "to":
                if (partner.comesfromlocation && hiker.comesfromlocation) {
                    var distancetothehike = distanceLatLons(
                        hiker.comesfromlocation.lat, hiker.comesfromlocation.lon,
                        partner.comesfromlocation.lat, partner.comesfromlocation.lon);
                    distances.tothehike.push({
                        phone: partner.phone,
                        distance: distancetothehike,
                        link: partner,
                    });
                }
                break;
            case "from":
                if (partner.returnstolocation && hiker.returnstolocation) {
                    var distancefromthehike = distanceLatLons(
                        hiker.returnstolocation.lat, hiker.returnstolocation.lon,
                        partner.returnstolocation.lat, partner.returnstolocation.lon);
                    distances.fromthehike.push({
                        phone: partner.phone,
                        distance: distancefromthehike,
                        link: partner,
                    });
                }        
                break;
            default:
                break;
        }
    }

    // Sort distances
    distances[direction+"thehike"].sort(function(b,a){
        var result = sorthikerdistances(b,a,hiker);
        return result;
    });

    logservices.loghikersdistances(distances, direction);

    return distances;
}

function sorthikerdistances(b, a, hiker) {
    adistance = a.distance;
    bdistance = b.distance;
    var result = adistance>bdistance ? -1 : adistance<bdistance ? 1 : 0;
    if (result == 0) {
        aplacesbothdirections = a.link.availableplacestothehike && a.link.availableplacesfromthehike;
        bplacesbothdirections = b.link.availableplacestothehike && b.link.availableplacesfromthehike;
        result = aplacesbothdirections>bplacesbothdirections ? -1 : bplacesbothdirections>aplacesbothdirections ? 1 : 0;
    }
    if (result == 0) {
        aage = a.link.age;
        bage = b.link.age;
        hikerage = hiker.age;
        if (aage && bage && hikerage) {
            aage = Math.abs(hikerage - aage);
            bage = Math.abs(hikerage - bage);
            result = aage>bage ? -1 : aage<bage ? 1 : 0;
        }
    }
    if (result == 0) {
        aname = a.link.fullname;
        bname = b.link.fullname;
        result = aname > bname;
    }
    return result;
}

function sortbyDistancesToStops(hiker, stops, direction) {
    var distances = {};
    var hikerlat;
    var hikerlon;
    if (direction == "to") {
        hikerlat = hiker.comesfromlocation.lat;
        hikerlon = hiker.comesfromlocation.lon;
    }
    else if (direction == "from") {
        hikerlat = hiker.returnstolocation.lat;
        hikerlon = hiker.returnstolocation.lon;
    }

    for (let indexstop = 0; indexstop < stops.length; indexstop++) {
        const stop = stops[indexstop];
        var stopdistance = distanceLatLons(hikerlat, hikerlon, stop.lat, stop.lon);
        var stopkey = stop.lat + "," + stop.lon;
        distances[stopkey] = stopdistance;
    }

    // Sort distances for each hiker
    stops.sort(function(b,a){
        var stopakey = a.lat + "," + a.lon;
        var stopbkey = b.lat + "," + b.lon;
        adistance = distances[stopakey];
        bdistance = distances[stopbkey];
        result = adistance>bdistance ? -1 : adistance<bdistance ? 1 : 0;
        return result;
    });

    logservices.logstopsdistances(stops, distances, direction);

    return stops;
}

function getHikerAreas(hikers) {
    // Initialization
    var areas = {
        driverstothehikeareas: {},
        driversfromthehikeareas: {},
        hitchhikerstothehikeareas: {},
        hitchhikersfromthehikeareas: {},
        sumtothehikeareas: {},
        sumfromthehikeareas: {},
    };
    for (var area in {"דרום":1, "צפון":1, "ירושלים":1, "חיפה":1, "מרכז":1}) {
        areas.driverstothehikeareas[area] = [];
        areas.driversfromthehikeareas[area] = [];
        areas.hitchhikerstothehikeareas[area] = [];
        areas.hitchhikersfromthehikeareas[area] = [];
        areas.sumtothehikeareas[area] = 0;
        areas.sumfromthehikeareas[area] = 0;
    }
    areas.sumtothehikeareas.all = 0;
    areas.sumfromthehikeareas.all = 0;

    var phones = [];

    for (let index = 0; index < hikers.length; index++) {
        var hiker = hikers[index];
        if (phones.indexOf(hiker.phone) != -1) {
            continue;
        }
        phones.push(hiker.phone);
        if (hiker.amidriver) {
            if (hiker.comesfromarea) {
                areas.sumtothehikeareas[hiker.comesfromarea] += hiker.availableplaces;
                areas.sumtothehikeareas.all += hiker.availableplaces;                    
                areas.driverstothehikeareas[hiker.comesfromarea].push(hiker);
                hiker.availableplacestothehike = hiker.availableplaces;
            }
            else {
                hiker.availableplacestothehike = 0;
            }
            if (hiker.returnstoarea) {
                areas.sumfromthehikeareas[hiker.returnstoarea] += hiker.availableplaces;
                areas.sumfromthehikeareas.all += hiker.availableplaces;                    
                areas.driversfromthehikeareas[hiker.returnstoarea].push(hiker);
                hiker.availableplacesfromthehike = hiker.availableplaces;
            }
            else {
                hiker.availableplacesfromthehike = 0;
            }
        }
        else {
            if (hiker.comesfromarea) {
                areas.sumtothehikeareas[hiker.comesfromarea] -= hiker.seatsrequired;
                areas.sumtothehikeareas.all -= hiker.seatsrequired;
                areas.hitchhikerstothehikeareas[hiker.comesfromarea].push(hiker);
                hiker.seatsrequiredtothehike = hiker.seatsrequired;
            }
            else {
                hiker.seatsrequiredtothehike = 0;
            }
            if (hiker.returnstoarea) {
                areas.sumfromthehikeareas[hiker.returnstoarea] -= hiker.seatsrequired;
                areas.sumfromthehikeareas.all -= hiker.seatsrequired;
                areas.hitchhikersfromthehikeareas[hiker.returnstoarea].push(hiker);
                hiker.seatsrequiredfromthehike = hiker.seatsrequired;
            }
            else {
                hiker.seatsrequiredfromthehike = 0;
            }
        }
    }

    logservices.logcalculationareas(areas); 

    return areas;
}