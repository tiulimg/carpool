var Promise = require('promise');

module.exports = {
    wait: wait,
    normalize_phonenumber: normalize_phonenumber,
    remove_past_hikes: remove_past_hikes,
    remove_hikes_notinlist: remove_hikes_notinlist,
    only_hikes_in_lang: only_hikes_in_lang,
    sort_hikes: sort_hikes,
    set_language: set_language,
    friendstext_from_friendsdetails: friendstext_from_friendsdetails,
    toRadians: toRadians,
    distanceLatLons: distanceLatLons,
    getDistanceMatrix: getDistanceMatrix,
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
    var φ1 = lat1.toRadians();
    var φ2 = lat2.toRadians();
    var Δφ = (lat2-lat1).toRadians();
    var Δλ = (lon2-lon1).toRadians();

    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    d = R * c;
    return d;
}

function getDistanceMatrix() {
    
}