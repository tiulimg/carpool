module.exports = {
    handleError: handleError,
    logRejection: logRejection,
    loghikersdistances: loghikersdistances,
    logstopsdistances: logstopsdistances,
    logcalculationareas: logcalculationareas,
    logcalculationresult: logcalculationresult,
}

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
    console.error("ERROR: " + reason);
    res.status(code || 500).json({"error": message});
}

function logRejection(rejection) {
    console.log("something went wrong: "  + rejection);
    if (rejection.stack) {
        console.dir(rejection.stack);
    }
}

function loghikersdistances(distances) {
    console.log("distances:");
    for (var source in distances) {
        source = distances[source];
        for (let index = 0; index < source.tothehike.length; index++) {
            const dest = source.tothehike[index];
            console.log("tothehike: source " + source.link.fullname + " distance " + dest.distance + " meters dest " + dest.link.fullname);
        }

        for (let index = 0; index < source.fromthehike.length; index++) {
            const dest = source.fromthehike[index];
            console.log("fromthehike: source " + source.link.fullname + " distance " + dest.distance + " meters dest " + dest.link.fullname);
        }
    }
}

function logstopsdistances(distances, direction) {
    console.log("distances:");
    for (let index = 0; index < distances.length; index++) {
        const dest = distances[index];
        console.log(direction + "thehike: distance " + dest.distance + " meters dest " + dest.link.name);
    }
}

function logcalculationareas(areas) {
    console.log("areas:");
    for (var area in areas.driverstothehikeareas) {
        console.log("area " + area);
        for (let index = 0; index < areas.driverstothehikeareas[area].length; index++) {
            const hiker = areas.driverstothehikeareas[area][index];
            console.log("driverstothehikearea: " + area + " " + hiker.fullname + " available " + hiker.availableplaces + 
                " friends " + JSON.stringify(hiker.myfriends));
        }
        for (let index = 0; index < areas.driversfromthehikeareas[area].length; index++) {
            const hiker = areas.driversfromthehikeareas[area][index];
            console.log("driversfromthehikeareas: " + area + " " + hiker.fullname + " available " + hiker.availableplaces + 
                " friends " + JSON.stringify(hiker.myfriends));
        }
        for (let index = 0; index < areas.hitchhikerstothehikeareas[area].length; index++) {
            const hiker = areas.hitchhikerstothehikeareas[area][index];
            console.log("hitchhikerstothehikeareas: " + area + " " + hiker.fullname + " seatsrequired " + hiker.seatsrequired + 
                " friends " + JSON.stringify(hiker.myfriends));
        }
        for (let index = 0; index < areas.hitchhikersfromthehikeareas[area].length; index++) {
            const hiker = areas.hitchhikersfromthehikeareas[area][index];
            console.log("hitchhikersfromthehikeareas: " + area + " " + hiker.fullname + " seatsrequired " + hiker.seatsrequired + 
                " friends " + JSON.stringify(hiker.myfriends));
        }
        console.log("sumtothehikeareas: " + areas.sumtothehikeareas[area]);
        console.log("sumfromthehikeareas: " + areas.sumfromthehikeareas[area]);    
    }
    console.log("sumtoareas all: " + areas.sumtothehikeareas.all);
    console.log("sumfromareas all: " + areas.sumfromthehikeareas.all);
}

function logcalculationresult(hikers) {
    console.log("calculaterides carpool calculation result:");
    for (let index = 0; index < hikers.length; index++) {
        const hiker = hikers[index];
        if (hiker.amidriver) {
            var hitchersto = "";
            var hitchersfrom = "";
            for (let hitcherindex = 0; hiker.myhitchersto && hitcherindex < hiker.myhitchersto.length; 
                hitcherindex++) {
                var hitcher = hiker.myhitchersto[hitcherindex].hitchername;
                if (hiker.myhitchersto[hitcherindex].hitcherfullname) {
                    hitcher = hiker.myhitchersto[hitcherindex].hitcherfullname;
                }
                hitchersto += hitcher + ", ";
            }
            for (let hitcherindex = 0; hiker.myhitchersfrom && hitcherindex < hiker.myhitchersfrom.length; 
                hitcherindex++) {
                var hitcher = hiker.myhitchersfrom[hitcherindex].hitchername;
                if (hiker.myhitchersfrom[hitcherindex].hitcherfullname) {
                    hitcher = hiker.myhitchersfrom[hitcherindex].hitcherfullname;
                }
                hitchersfrom += hitcher + ", ";
            }
            var myfriends = "";
            for (let friendindex = 0; hiker.myfriends && friendindex < hiker.myfriends.length; 
                friendindex++) {
                const friend = hiker.myfriends[friendindex];
                myfriends +=  ", " + friend;
            }
            console.log(hiker.hikerindex + " " + hiker.fullname + myfriends + 
                " to the hike: takes " + hitchersto);                                        
            console.log(hiker.hikerindex + " " + hiker.fullname + myfriends + 
                " from the hike: takes " + hitchersfrom);                                        
        }
        else {
            if (hiker.mydriverto && hiker.mydriverfrom) {
                var friendsdriversto = "";
                var friendsdriversfrom = "";
                for (let driverindex = 0; 
                    hiker.myfriendsdriversto && driverindex < hiker.myfriendsdriversto.length; 
                    driverindex++) {
                    const driver = hiker.myfriendsdriversto[driverindex].driverfullname;
                    friendsdriversto += ", " + driver;
                }
                for (let driverindex = 0; 
                    hiker.myfriendsdriversfrom && driverindex < hiker.myfriendsdriversfrom.length; 
                    driverindex++) {
                    const driver = hiker.myfriendsdriversfrom[driverindex].driverfullname;
                    friendsdriversfrom += ", " + driver;
                }
                var myfriends = "";
                for (let friendindex = 0; hiker.myfriends && friendindex < hiker.myfriends.length; 
                    friendindex++) {
                    const friend = hiker.myfriends[friendindex];
                    myfriends +=  ", " + friend;
                }
                console.log(hiker.hikerindex + " " + hiker.fullname + myfriends +
                    " to the hike: joins " + hiker.mydriverto.fullname + friendsdriversto);
                console.log(hiker.hikerindex + " " + hiker.fullname + myfriends +
                    " from the hike: joins " + hiker.mydriverfrom.fullname + friendsdriversfrom);
            }
            else
            {
                console.log(hiker.hikerindex + " " + hiker.fullname + " no drivers");
            }
        }
    }
}