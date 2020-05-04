var request = require("request-json");
var url = require("url");

module.exports = {
    sendSMS: sendSMS,
}

function sendSMS() {
    var TILL_URL = url.parse(process.env.TILL_URL);
    var TILL_BASE = TILL_URL.protocol + "//" + TILL_URL.host;
    var TILL_PATH = TILL_URL.pathname;
    
    if(TILL_URL.query != null) {
      TILL_PATH += "?"+TILL_URL.query;
    }
    
    console.log("sending SMS");
    request.createClient(TILL_BASE).post(TILL_PATH, {
      "phone": ["972534260626"],
      "questions": [{
      "text": "נרשמת לטיול בחרמון ב-8.5, תבוא?",
        "tag": "planned",
        "responses": ["כן", "לא"],
        "webhook": "http://tiulimg-carpool.herokuapp.com/api/gotsms"
      }],
      "conclusion": "אחלה, נהיה בקשר בערב בנוגע לסידור של הטרמפים :)"
    }, function(err, res, body) {
      console.log(res.statusCode);
      console.log(err);
      console.log(JSON.stringify(body));
    });
}