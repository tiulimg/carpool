var Promise = require('promise');

module.exports = {
    wait: wait,
    normalize_phonenumber: normalize_phonenumber,
    get_near_hikes: get_near_hikes, 
    remove_past_hikes: remove_past_hikes,
    remove_hikes_notinlist: remove_hikes_notinlist,
    only_hikes_in_lang: only_hikes_in_lang,
    sort_hikes: sort_hikes,
    set_language: set_language,
    friendstext_from_friendsdetails: friendstext_from_friendsdetails,
    toRadians: toRadians,
    distanceLatLons: distanceLatLons,
    getDistanceMatrix: getDistanceMatrix,
    getHikerAreas: getHikerAreas,
};  

function wait(ms)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}

function normalize_phonenumber(phonenumber) {
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

function only_hikes_in_lang(docs, hikelist, istext, lang) {
    if (istext) {
        for (let index = 0; index < hikelist.length; index++) {
            const hike = hikelist[index];
            docHike = docs.find(function(element) {
                var result = false;
                if ((element.hikenamehebrew && 
                    element.hikenamehebrew.indexOf(hike) != -1) ||
                    (element.hikenameenglish && 
                    element.hikenameenglish.indexOf(hike) != -1)) {
                    result = true;
                }
                return result;
            });

            if (index + 1 < hikelist.length) {
                var nexthike = hikelist[index + 1];
//                console.log("only_hikes_in_lang hike " + hike + " nexthike " + nexthike);
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
            docHike = docs.find(function(element) {
                var result = false;
                if ((element.hikenamehebrew && 
                    element.hikenamehebrew.indexOf(hike) != -1) ||
                    (element.hikenameenglish && 
                    element.hikenameenglish.indexOf(hike) != -1)) {
                    result = true;
                }
                return result;
            });

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
    var nearhikes = [];
    hikes = remove_past_hikes(hikes, false);
    hikes.forEach(hike => {
        var hikesplit = hike.hikedate.split(".");
        var hikestarttime = Date.parse('20' + hikesplit[2] + '/' + hikesplit[1] + '/' + hikesplit[0]);
        var days = 15;
        var dateOffset = (24*60*60*1000) * days;
        if (hikestarttime.getTime() - dateOffset < now.getTime()) {
            nearhikes.push(hike);
        }
    });
    console.log("nearhikes " + JSON.stringify(nearhikes));
    return nearhikes;
}

function remove_past_hikes(hikelist, istext) {
    var today = new Date()
    if (istext) {
        for (let index = 0; index < hikelist.length; index++) {
            const hike = hikelist[index];
            // console.log("remove_past_hikes hike " + hike);
            var hikedate = hike.match(/\d{1,2}\.\d{1,2}\.\d{2}/g);
            if (hikedate != null && hikedate.length > 0) {
                hikedate = hikedate[0];
                // console.log("remove_past_hikes hikedate " + hikedate);
                hikesplit = hikedate.split(".");
                hikedate = Date.parse('20' + hikesplit[2] + '/' + hikesplit[1] + '/' + hikesplit[0]);
                // console.log("remove_past_hikes hikedate " + hikedate + " today " + today);
                if (today > hikedate) {
                    hikelist.splice(index,1);
                    index--;
                }          
            }
        }
    }
    else {
        for (let index = 0; index < hikelist.length; index++) {
            const hike = hikelist[index];
            // console.log("remove_past_hikes hike " + JSON.stringify(hike));
            hikesplit = hike.hikedate.split(".");
            hikedate = Date.parse('20' + hikesplit[2] + '/' + hikesplit[1] + '/' + hikesplit[0]);
            // console.log("remove_past_hikes hikedate " + hikedate + " today " + today);
            if (today > hikedate) {
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
            selectHike = docs.find(function(element) {
                var result = false;
                if ((element.hikenamehebrew && 
                    element.hikenamehebrew.indexOf(hikedate[0]) != -1) ||
                    (element.hikenameenglish && 
                    element.hikenameenglish.indexOf(hikedate[0]) != -1)) {
                    result = true;
                }
                return result;
            });
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
            var adate = a.match(/\d{1,2}\.\d{1,2}\.\d{2}/g);
            var bdate = b.match(/\d{1,2}\.\d{1,2}\.\d{2}/g);
            if (!adate && !bdate) {
                return 0;
            }
            else if (!bdate) {
                return 1;
            }
            else if (!adate) {
                return -1;
            }
            else {
                // console.log("sort_hikes adate " + adate + " bdate " + bdate);
                asplit = adate[0].split(".");
                bsplit = bdate[0].split(".");
                a = Date.parse('20' + asplit[2] + '/' + asplit[1] + '/' + asplit[0]);
                b = Date.parse('20' + bsplit[2] + '/' + bsplit[1] + '/' + bsplit[0]);
                var result = a>b ? -1 : a<b ? 1 : 0;
                // console.log("sort_hikes result " + result);
                return result;
            }
        });
    }
    else {
        docs.sort(function(b,a){
            // console.log("sort_hikes a " + a.hikedate + " b " + b.hikedate);
            asplit = a.hikedate.split(".");
            bsplit = b.hikedate.split(".");
            a = Date.parse('20' + asplit[2] + '/' + asplit[1] + '/' + asplit[0]);
            b = Date.parse('20' + bsplit[2] + '/' + bsplit[1] + '/' + bsplit[0]);
            result = a>b ? -1 : a<b ? 1 : 0;
            // console.log("sort_hikes result " + result);
            return result;
        });
    }
    return docs;
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
            const friend = friendsdetails[index];
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

function getDistanceMatrix(hikers) {
    var distances = {};

    if (hikers.length > 0) {
        distances[hikers[0].phone] = {
            tothehike: [],
            fromthehike: [],
            link: hikers[0],
        };
    }

    for (let index = 1; index < hikers.length; index++) {
        const hiker = hikers[index];

        var distancetothehike = distanceLatLons(
            hiker.wherefromlocation.lat, hiker.wherefromlocation.lon,
            hikers[0].wherefromlocation.lat, hikers[0].wherefromlocation.lon);
        var distancefromthehike = distanceLatLons(
            hiker.wheretolocation.lat, hiker.wheretolocation.lon,
            hikers[0].wheretolocation.lat, hikers[0].wheretolocation.lon);

        distances[hikers[0].phone].tothehike.push({
            phone: hiker.phone,
            distance: distancetothehike,
            link: hiker,
        });
        distances[hikers[0].phone].fromthehike.push({
            phone: hiker.phone,
            distance: distancefromthehike,
            link: hiker,
        });
        
        distances[hiker.phone] = {
            tothehike: [],
            fromthehike: [],
            link: hiker,
        };
        distances[hiker.phone].tothehike.push({
            phone: hikers[0].phone,
            distance: distancetothehike,
            link: hikers[0],
        });
        distances[hiker.phone].fromthehike.push({
            phone: hikers[0].phone,
            distance: distancefromthehike,
            link: hikers[0],
        });
    }

    for (let index = 1; index < hikers.length; index++) {
        const hiker = hikers[index];
        for (let indexpartner = index; indexpartner < hikers.length; indexpartner++) {
            const partner = hikers[indexpartner];
            if (hiker == partner) {
                continue;
            }

            var distancetothehike = distanceLatLons(
                hiker.wherefromlocation.lat, hiker.wherefromlocation.lon,
                partner.wherefromlocation.lat, partner.wherefromlocation.lon);
            var distancefromthehike = distanceLatLons(
                hiker.wheretolocation.lat, hiker.wheretolocation.lon,
                partner.wheretolocation.lat, partner.wheretolocation.lon);

            distances[hiker.phone].tothehike.push({
                phone: partner.phone,
                distance: distancetothehike,
                link: partner,
            });
            distances[hiker.phone].fromthehike.push({
                phone: partner.phone,
                distance: distancefromthehike,
                link: partner,
            });

            distances[partner.phone].tothehike.push({
                phone: hiker.phone,
                distance: distancetothehike,
                link: hiker,
            });
            distances[partner.phone].fromthehike.push({
                phone: hiker.phone,
                distance: distancefromthehike,
                link: hiker,
            });
        }
    }

    // Sort distances for each hiker
    for (let index = 0; index < hikers.length; index++) {
        const hiker = hikers[index];
        
        distances[hiker.phone].tothehike.sort(function(b,a){
            a = a.distance;
            b = b.distance;
            result = a>b ? -1 : a<b ? 1 : 0;
            return result;
        });
        distances[hiker.phone].fromthehike.sort(function(b,a){
            a = a.distance;
            b = b.distance;
            result = a>b ? -1 : a<b ? 1 : 0;
            return result;
        });

    }

    console.log("distances:");
    for (var source in distances) {
        source = distances[source];
        for (let index = 0; index < source.tothehike.length; index++) {
            const dest = source.tothehike[index];
            console.log("tothehike: source " + source.link.name + " distance " + dest.distance + " dest " + dest.link.name);
        }

        for (let index = 0; index < source.fromthehike.length; index++) {
            const dest = source.fromthehike[index];
            console.log("fromthehike: source " + source.link.name + " distance " + dest.distance + " dest " + dest.link.name);
        }
    }

    return distances;
}

function getHikerAreas(hikers) {
    var areas = {
        driverswheretoareas: {
            "דרום": [],
            "צפון": [],
            "ירושלים": [],
            "חיפה": [],
            "מרכז": [],
        },
        driverswherefromareas: {
            "דרום": [],
            "צפון": [],
            "ירושלים": [],
            "חיפה": [],
            "מרכז": [],
        },
        hitchhikerswheretoareas: {
            "דרום": [],
            "צפון": [],
            "ירושלים": [],
            "חיפה": [],
            "מרכז": [],
        },
        hitchhikerswherefromareas: {
            "דרום": [],
            "צפון": [],
            "ירושלים": [],
            "חיפה": [],
            "מרכז": [],
        },
        sumtoareas: {
            "דרום": 0,
            "צפון": 0,
            "ירושלים": 0,
            "חיפה": 0,
            "מרכז": 0,
            "all": 0,
        },
        sumfromareas: {
            "דרום": 0,
            "צפון": 0,
            "ירושלים": 0,
            "חיפה": 0,
            "מרכז": 0,
            "all": 0,
        },
    };

    for (let index = 0; index < hikers.length; index++) {
        const hiker = hikers[index];
        if (hiker.amidriver) {
            areas.sumtoareas[hiker.wheretoarea] += hiker.availableplaces;
            areas.sumtoareas.all += hiker.availableplaces;
            areas.sumfromareas[hiker.wherefromarea] += hiker.availableplaces;
            areas.sumfromareas.all += hiker.availableplaces;
            areas.driverswheretoareas[hiker.wheretoarea].push(hiker);
            areas.driverswherefromareas[hiker.wherefromarea].push(hiker);
            hiker.availableplacestothehike = hiker.availableplaces;
            hiker.availableplacesfromthehike = hiker.availableplaces;
        }
        else {
            areas.sumtoareas[hiker.wheretoarea] -= hiker.seatsrequired;
            areas.sumtoareas.all -= hiker.seatsrequired;
            areas.sumfromareas[hiker.wherefromarea] -= hiker.seatsrequired;
            areas.sumfromareas.all -= hiker.seatsrequired;
            areas.hitchhikerswheretoareas[hiker.wheretoarea].push(hiker);
            areas.hitchhikerswherefromareas[hiker.wherefromarea].push(hiker);
            hiker.seatsrequiredtothehike = hiker.seatsrequired;
            hiker.seatsrequiredfromthehike = hiker.seatsrequired;
        }
    }
    console.log("areas " + JSON.stringify(areas));

    return areas;
}