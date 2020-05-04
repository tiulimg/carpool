var Promise = require('promise');
var fs = require('fs');

var logservices = require("./logservices");
var dbservices = require("./dbservices");
var ridesmodule = require("./rides");

var stops = JSON.parse(fs.readFileSync('./stopsparser/meetingpoints.json', 'utf8'));

module.exports = {
    saveroutes: saveroutes,
}

function saveroutes(res) {
    var sourcelocation = {
        "name": "תל אביב",
        "lat":32.0805,
        "lon":34.7805
    };
    
    for (let index = 0; index < stops.length; index++) {
        const stop = stops[index];
        ridesmodule.findroute(sourcelocation.lat, sourcelocation.lon, stop.lat, stop.lon, "car", "2020-06-04T07:00:00.000Z", null)
        .then(route => {
            route.startlat = sourcelocation.lat;
            route.startlon = sourcelocation.lon;
            route.endlat = stop.lat;
            route.endlon = stop.lon;
            route.mode = "car";
            route.arrival = "2020-06-04T07:00:00.000Z";
            route.mode = "car";
            dbservices.insertnewroute(res, route);
            //var key = sourcelocation.lat+"_"+sourcelocation.lon+"-"+stop.lat+"_"+stop.lon;
            //fs.writeFileSync("./routetomeetingpoints/car_"+key+".json", route);
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
}