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

function getCityName(stop_description) {
  var city = "";
  var regex = /עיר: ([0-9א-ת ]+) רציף:/;
  if (stop_description) {
    var city_match = stop_description.match(regex);
    //console.log("stop_description " + stop_description + " city_match " + JSON.stringify(city_match));
    if (city_match) {
      city = city_match[1];
    }
  }
  return city;
}

// require csvtojson
var csv = require("csvtojson");

// Convert a csv file with csvtojson
csv()
.fromFile("./stops-areasorted.csv")
.then(function(jsonStops){ //when parse finished, result will be emitted here.
  //console.log(jsonStops); 

  var resultstops = [];
  var currareastop;
  var valid_descriptions = ["צומת", "רכבת", "קניון", "מרכזית", "מסוף", "מחלף", "מסעף"];
  var min_distance = 1000;
  
  for (let index = 0; index < jsonStops.length; index++) {
    const csvstop = jsonStops[index];
    if (csvstop.location_type == '1') {
      currareastop = {
        name: csvstop.stop_name + ", " + getCityName(csvstop.stop_desc),
        lat: parseFloat(csvstop.stop_lat),
        lon: parseFloat(csvstop.stop_lon),
        // zone: csvstop.zone_id,
      };
      resultstops.push(currareastop);
    }
    else {
      for (let descindex = 0; descindex < valid_descriptions.length; descindex++) {
        const desc = valid_descriptions[descindex];
        if (csvstop.stop_name.indexOf(desc) != -1) {
          currareastop = {
            name: csvstop.stop_name + ", " + getCityName(csvstop.stop_desc),
            lat: parseFloat(csvstop.stop_lat),
            lon: parseFloat(csvstop.stop_lon),
            // zone: csvstop.zone_id,
          };
          resultstops.push(currareastop);
        }
      }
    }
  }

  for (let index = 0; index < resultstops.length - 1; index++) {
    const stop = resultstops[index];
    for (let otherstopindex = index + 1; otherstopindex < resultstops.length; otherstopindex++) {
      const otherstop = resultstops[otherstopindex];
      var distance = distanceLatLons(stop.lat, stop.lon, otherstop.lat, otherstop.lon);
      if (distance < min_distance) {
        resultstops.splice(otherstopindex,1);
        otherstopindex--;
        //console.log("near stop " + stop.name + " other " + otherstop.name + " distance " + distance);
      }
      else {
        //console.log("not near stop " + stop.name + " other " + otherstop.name + " distance " + distance);
      }
    }
  }

  console.log("resultstops.length " + resultstops.length);

  var fs = require('fs');
  fs.writeFile("meetingpoints.json", JSON.stringify(resultstops), function(){
    console.log("success");
  });
})

