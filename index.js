var express = require("express");
var bodyParser = require("body-parser");
var moment = require("moment");
var fs = require('fs');

// Custom modules
var dbservices = require("./dbservices");
var tools = require("./tools");
var logservices = require("./logservices");
var mail = require("./mail");
var replies = require("./replies");
var register = require("./register_to_hikes");
var ridesmodules = require("./rides");
var sapchatbot = require("./sapchatbot");
var messageconnector = require("./messageconnector");
const { start } = require("repl");
const { env } = require("process");
var wanttomodify_obj = JSON.parse(fs.readFileSync('./resources/wanttomodifytexts.json', 'utf8'));

var app = express();
// Serve static files from the React app
app.use(express.static('app/build'));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use((err, req, res, next) => {
    // This check makes sure this is a JSON parsing issue, but it might be
    // coming from any middleware, not just body-parser:

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error(err);
        return res.sendStatus(400); // Bad request
    }

    next();
});

// Connect to the database before starting the application server.
dbservices.initialize(app)
.catch(rejection => {
    logservices.logRejection(rejection);
});

/*  "/api/debug"
*    POST: prints all conversation details
*/

app.post("/api/debug", function(req, res) {
    console.log("req.url: " + JSON.stringify(req.url));
    console.log("req.body: " + JSON.stringify(req.body));
    res.status(200).json("OK");
});

/*  "/api/areridessetuped"
*    PATCH: checks whether rides are already setuped 
*/

app.patch("/api/areridessetuped", function(req, res) {
    var memory = req.body;
    dbservices.gethikerswithdrivers(res)
    .then(docs => {
        var language = tools.set_language(memory);
        var setuped = false;
        if (typeof docs !== 'undefined' && docs != null && docs.length > 0) {
            setuped = true;
        }
        memory.rideshadsetuped = setuped;
        if (setuped) {
            if (!memory.phonenumber) {
                conversation_reply = replies.get_reply("GETRIDEDETAILS_ENTERPHONE",language,null,memory);
                memory.stage = "getridedetails_getphone";
            }
            else {
                conversation_reply = replies.get_reply("CHOOSE_HIKE_TO_EDIT",language,null,memory);    
                memory.stage = "getridedetails_choosehike";
            }
        }
        else {
            conversation_reply = replies.get_reply("RIDES_ARENT_SETUPED",language,null,memory);
            delete memory.stage;
        }
        res.status(200).json(conversation_reply);
    })
    .catch(rejection => {
        logservices.logRejection(rejection);
    });
});

/*  "/api/wanttomodify"
*    POST: get my hike register details for review
*    PUT: update one field in hike register
*/

app.post("/api/wanttomodify", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, memory.pwd)) {
        console.log("memory: " + JSON.stringify(memory));
        var language = tools.set_language(memory);

        var params = {
            "email":"דוא\"ל",
            "name":"שם",
            "hikes":"טיולים",
            "comes from":"מגיע מ",
            "returns to":"חוזר ל",
            "car/ride":"רכב/טרמפ",
            "available places":"מקומות פנויים",
            "phone number":"מספר טלפון",
            "saved the date":"שומר את התאריך",
            "i fear of":"אני חושש מ",
            "share my age":"שתף את הגיל שלי",
            "age":"גיל",
            "friends joining":"חברים שמצטרפים",
            "heard of the group":"שמעתי על הקבוצה",
            "plays on":"מנגן על",
            "i'm gay":"אני הומו",
            "can organize":"יכול לארגן",
        }

        if (memory.operation && memory.operation == 'edithike') {
            delete params.hikes;
        }

        var starts = {
            "name":{
                "texts": ["My name is ", "I'm ", "שמי ", "אני "],
                "variable": "myname",
            },
            "comes from":{
                "texts": ["I come from ", "מגיע מ", "אני מגיע מ"],
                "variable": "comefrom2",
            },
            "returns to":{
                "texts": ["I return to ", "חוזר ל", "אני חוזר ל"],
                "variable": "returnto2"
            },
            "age":{
                "texts": ["I'm ", "אני בן ", "בן "],
                "variable": "age"
            }
        }

        memory.registertohikes = {
            "plays on": memory.playson2,
            "available places": memory.availableplaces,
            "name": memory.myname,
            "share my age": memory.shareage2,
            "friends joining": memory.friendstext,
            "i'm gay": memory.isgay2,
            "i fear of": memory.ifearof2,
            "heard of the group": memory.howdidihear2,
            "car/ride": memory.comewithcar2,
            "can organize": memory.volunteer2,
            "saved the date": memory.savedthedate2,
            "hikes": memory.emptyhikes,
            "returns to": memory.returnto2,
            "phone number": memory.phonenumber,
            "comes from": memory.comefrom2,
            "email": memory.email2,
            "age": memory.age
        };

        for (var property in starts) {
            for (var index = 0; index < starts[property].texts.length; index++) {
                var text = starts[property].texts[index];
                if (memory.registertohikes[property] && memory.registertohikes[property].startsWith(text))
                {
                    memory.registertohikes[property] = memory.registertohikes[property].replace(text,"");
                    memory[starts[property].variable] = memory[starts[property].variable].replace(text,"");
                }
            }
        }

        if (memory.registertohikes["car/ride"].indexOf("רכב") == -1 && 
            memory.registertohikes["car/ride"].indexOf("car") == -1) {
            if (memory.availableplaces) {
                delete memory.availableplaces;
            }
            memory.registertohikes["available places"] = "";
            delete params["available places"];
        }

        if (memory.registertohikes["saved the date"].indexOf("concerns") == -1 && 
            memory.registertohikes["saved the date"].indexOf("חששות") == -1) {
            if (memory.ifearof) {
                delete memory.ifearof;
            }
            memory.registertohikes["i fear of"] = "";
            delete params["i fear of"];
        }

        if (["לא", "No", "דלג", "Skip"].includes(memory.registertohikes["share my age"])) {
            if (memory.age) {
                delete memory.age;
            }
            memory.registertohikes["age"] = "";
            delete params["age"];
        }

        var hike_registration_details = "";

        var index = 1;
        for (var property in params) {
            if (params.hasOwnProperty(property)) {
                switch (language) {
                    case "he":
                        hike_registration_details += index + ": " + params[property] + ": "+memory.registertohikes[property]+"\n";
                        break;
                    case "en":
                        hike_registration_details += index + ": " + property + ": "+memory.registertohikes[property]+"\n";
                        break;
                    default:
                        break;
                }
                index++;
            }
        }

        var conversation_reply = 
            replies.get_reply("REGISTER_TO_HIKES_DETAILS",language,[hike_registration_details],memory); 
        var title = replies.get_conversation_string("REGISTER_TO_HIKES_MODIFY", language);
        conversation_reply = replies.push_to_reply(conversation_reply, title);
       
        res.status(200).json(conversation_reply);        
    }
});

app.put("/api/wanttomodify", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, memory.pwd)) {
        console.log("memory: " + JSON.stringify(memory));
        var language = tools.set_language(memory);

        var params = [
            "email",
            "name",
            "hikes",
            "comes from",
            "returns to",
            "car/ride",
            "available places",
            "phone number",
            "saved the date",
            "i fear of",
            "share my age",
            "age",
            "friends joining",
            "heard of the group",
            "plays on",
            "i'm gay",
            "can organize",
        ];

        var paramstodelete = {
            "email":"email",
            "name":"name",
            "hikes":"selectedhikes",
            "comes from":"comefrom",
            "returns to":"returnto",
            "car/ride":"comewithcar",
            "available places":"availableplaces",
            "phone number":"phonenumber",
            "saved the date":"savedthedate",
            "i fear of":"ifearof",
            "share my age":"shareage",
            "age":"age",
            "friends joining":"dofriendsjoin",
            "heard of the group":"howdidihear",
            "plays on":"playson",
            "i'm gay":"isgay",
            "can organize":"volunteer",
        }

        var paramstodelete2 = {
            "email":"email2",
            "name":"myname",
            "hikes":"selectedhikes",
            "comes from":"comefrom2",
            "returns to":"returnto2",
            "car/ride":"comewithcar2",
            "available places":"availableplaces",
            "phone number":"phonenumber2",
            "saved the date":"savedthedate2",
            "i fear of":"ifearof2",
            "share my age":"shareage2",
            "age":"age",
            "friends joining":"dofriendsjoin2",
            "heard of the group":"howdidihear2",
            "plays on":"playson2",
            "i'm gay":"isgay2",
            "can organize":"volunteer2",
        }

        var paramstodelete3 = {
            "email":"email2",
            "name":"myname",
            "hikes":"selectedhikes",
            "comes from":"comefrom2",
            "returns to":"returnto2",
            "car/ride":"availableplaces",
            "available places":"availableplaces",
            "phone number":"phonenumber2",
            "saved the date":"ifearof",
            "i fear of":"ifearof2",
            "share my age":"age",
            "age":"age",
            "friends joining":"dofriendsjoin2",
            "heard of the group":"howdidihear2",
            "plays on":"playson2",
            "i'm gay":"isgay2",
            "can organize":"volunteer2",
        }

        var stages = {
            "email":"wanttomodify_email",
            "name":"wanttomodify_name",
            "hikes":"wanttomodify_selecthikes",
            "comes from":"wanttomodify_comesfrom",
            "returns to":"wanttomodify_returnto",
            "car/ride":"wanttomodify_comewithcar",
            "available places":"wanttomodify_availableplaces",
            "phone number":"wanttomodify_phonenumber",
            "saved the date":"wanttomodify_savedthedate",
            "i fear of":"wanttomodify_whatyoufearof",
            "share my age":"wanttomodify_shareage",
            "age":"wanttomodify_age",
            "friends joining":"wanttomodify_friendsname",
            "heard of the group":"wanttomodify_howdidihear",
            "plays on":"wanttomodify_playson",
            "i'm gay":"wanttomodify_isgay",
            "can organize":"wanttomodify_volunteer",
        }

        var fix_field = parseInt(memory.fix_field.raw) - 1;
        if (memory.operation && memory.operation == 'edithike') {
            var spliceindex = params.indexOf("hikes");
            params.splice(spliceindex,1);
            delete paramstodelete["hikes"];
            delete stages["hikes"];
        }

        if (memory.registertohikes["car/ride"].indexOf("רכב") == -1 && 
            memory.registertohikes["car/ride"].indexOf("car") == -1) {
            var paramNotRelevant = "available places";
            var spliceindex = params.indexOf(paramNotRelevant);
            params.splice(spliceindex,1);
            delete paramstodelete[paramNotRelevant];
            delete stages[paramNotRelevant];
        }

        if (memory.registertohikes["saved the date"].indexOf("concerns") == -1 && 
            memory.registertohikes["saved the date"].indexOf("חששות") == -1) {
            var paramNotRelevant = "i fear of";
            var spliceindex = params.indexOf(paramNotRelevant);
            params.splice(spliceindex,1);
            delete paramstodelete[paramNotRelevant];
            delete stages[paramNotRelevant];
        }

        if (["לא", "No", "דלג", "Skip"].includes(memory.registertohikes["share my age"])) {
            var paramNotRelevant = "age";
            var spliceindex = params.indexOf(paramNotRelevant);
            params.splice(spliceindex,1);
            delete paramstodelete[paramNotRelevant];
            delete stages[paramNotRelevant];
        }

        var needtosubmit = true;
        console.log("params " + JSON.stringify(params));
        console.log("fix_field " + fix_field + " params.length " + params.length);
        if (fix_field + 1 > params.length) {
            conversation_reply =
                replies.get_reply("CHOOSED_INCORRECT_OPTION",language,null,memory);
        }
        else {
            fix_field = params[fix_field];
            console.log("fix_field " + fix_field);

            memory.stage = stages[fix_field];
            console.log("memory.stage " + memory.stage);
            var conversation_reply = 
                replies.get_reply("NO_ANSWER",language,null,memory);
            var reply_wanttomodify_obj = wanttomodify_obj.find(function(element) {
                var result = false;
                if (element.key && element.key == fix_field) {
                    result = true;
                }
                return result;
            });
            var reply_obj;
            switch (language) {
                case "he":
                    reply_obj = reply_wanttomodify_obj.he;
                    break;
                case "en":
                    reply_obj = reply_wanttomodify_obj.en;
                    break;
                default:
                    break;
            }
            console.log("reply_obj " + reply_obj);

            switch (fix_field) {
                case "hikes":
                    needtosubmit = false;
                    var hikes = JSON.parse(JSON.stringify(memory.selectedhikes));

                    conversation_reply =
                        replies.get_reply("HIKES_SELECTED",language,[memory.selectedhikes.join("\n")],memory);

                    dbservices.gethikes(res)
                    .then(docs => {
                        docs = tools.sort_hikes(docs);

                        conversation_reply = 
                            register.setAvailableHikesReplyBut(conversation_reply, docs, language, hikes);
                        res.status(200).json(conversation_reply);
                    })
                    .catch(rejection => {
                        logservices.logRejection(rejection);
                    });
                    break;
                case "friends joining":
                    conversation_reply =
                        replies.get_reply("REGISTER_TO_HIKES_ADD_FRIEND",language,[memory.friendstext],memory);    
                    break;
                case "car/ride":
                case "saved the date":
                case "share my age":
                    if (typeof reply_obj === 'string') {
                        conversation_reply = replies.push_quick_reply(conversation_reply, reply_obj);
                    }
                    else {
                        for (let index = 0; index < reply_obj.length - 1; index++) {
                            const element = reply_obj[index];
                            conversation_reply = replies.push_to_reply(conversation_reply, element);
                        }
                        conversation_reply = 
                            replies.push_quick_reply(conversation_reply, reply_obj[reply_obj.length - 1]);
                    }
                    var buttons = reply_wanttomodify_obj["buttons_" + language];
                    for (let index = 0; index < buttons.length; index++) {
                        const button = buttons[index];
                        conversation_reply = 
                            replies.push_quick_reply_option(conversation_reply, button.text, button.val);
                    }
                    break;
                default:
                    var buttons = reply_wanttomodify_obj["buttons_" + language];
                    if (buttons) {
                        if (typeof reply_obj === 'string') {
                            conversation_reply = replies.push_quick_reply(conversation_reply, reply_obj);
                        }
                        else {
                            for (let index = 0; index < reply_obj.length - 1; index++) {
                                const element = reply_obj[index];
                                conversation_reply = replies.push_to_reply(conversation_reply, element);
                            }
                            conversation_reply = 
                                replies.push_quick_reply(conversation_reply, reply_obj[reply_obj.length - 1]);
                        }
                        for (let index = 0; index < buttons.length; index++) {
                            const button = buttons[index];
                            conversation_reply = 
                                replies.push_quick_reply_option(conversation_reply, button.text, button.val);
                        }
                    }
                    else {
                        if (typeof reply_obj === 'string') {
                            conversation_reply = replies.push_to_reply(conversation_reply, reply_obj);
                        }
                        else {
                            for (let index = 0; index < reply_obj.length; index++) {
                                const element = reply_obj[index];
                                conversation_reply = replies.push_to_reply(conversation_reply, element);
                            }
                        }
                    }
                    break;
            }
            console.log("A " + fix_field + " " + paramstodelete[fix_field] + " " + memory[paramstodelete[fix_field]] + " " + 
                memory[paramstodelete2[fix_field]] + " " + memory[paramstodelete3[fix_field]]);
            if (memory[paramstodelete[fix_field]]) {
                delete memory[paramstodelete[fix_field]];
            }
            if (memory[paramstodelete2[fix_field]]) {
                delete memory[paramstodelete2[fix_field]];
            }
            if (memory[paramstodelete3[fix_field]]) {
                delete memory[paramstodelete3[fix_field]];
            }
        }

        if (needtosubmit) {
            res.status(200).json(conversation_reply);        
        }
    }
});

/*  "/api/friendsdetails"
*    POST: concatenates friends details
*    PUT: deletes one friend by index
*/

app.post("/api/friendsdetails", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, memory.pwd)) {
        var language = tools.set_language(memory);
        if (typeof memory.friendsdetails === 'undefined' || memory.friendsdetails == null) {
            memory.friendsdetails = [];
        }
        var hebindex = memory.friendsname2.indexOf("שם החבר ");
        var engindex = memory.friendsname2.indexOf("The friend name is ");
        if (hebindex != -1) {
            memory.friendsname2 = memory.friendsname2.replace("שם החבר ","");
        }
        else {
            if (engindex != -1) {
                memory.friendsname2 = memory.friendsname2.replace("The friend name is ","");
            }
        }
        var friendage = "";
        if (memory.friendage && memory.friendage.raw && memory.friendage.raw != "0") {
            friendage = memory.friendage.raw.replace("אני בן ","").replace("בן ");
        }
        memory.friendsdetails.push({
            name: memory.friendsname2,
            age: friendage,
            savesthedate: memory.friendsavesthedate2,
        });
        delete memory.friendname;
        delete memory.friendsname2;
        delete memory.friendage;
        delete memory.friendsavesthedate;
        delete memory.friendsavesthedate2;
        memory.friendstext = tools.friendstext_from_friendsdetails(memory.friendsdetails);
        var conversation_reply = 
        replies.get_reply("REGISTER_TO_HIKES_ADD_FRIEND",language,[memory.friendstext],memory);    
        res.status(200).json(conversation_reply);
    } 
});

app.put("/api/friendsdetails", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, memory.pwd)) {
        var language = tools.set_language(memory);
        delete memory.friendname;
        delete memory.friendage;
        delete memory.friendsavesthedate;
        var removeindex = parseInt(memory.removeindex.raw);
        if (!memory.friendsdetails) {
            memory.friendsdetails = [];
        }
        if (memory.friendsdetails.length <= removeindex) {
            memory.friendsdetails.splice(removeindex - 1, 1);
        }
        memory.friendstext = tools.friendstext_from_friendsdetails(memory.friendsdetails);
        var conversation_reply = 
            replies.get_reply("REGISTER_TO_HIKES_ADD_FRIEND",language,[memory.friendstext],memory);    
        res.status(200).json(conversation_reply);
    } 
});

/*  "/api/lastregister"
*    GET: gets last register details for all hikers
*    POST: creates or updates a last register
*    DELETE: deletes all last registers
*/

app.get("/api/lastregister", function(req, res) {
    if (tools.checkpwd(res, req.query.pwd)) {
        dbservices.getlastregisters(res)
        .then(docs => {
            res.status(200).json(docs);
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

app.post("/api/lastregister", function(req, res) {
    if (tools.checkpwd(res, req.query.pwd)) {
        console.log(JSON.stringify(req.body));

        var formParams = {
            "email": "email",
            "editlink": "link",
            "בחר שפה - Choose Language":"lang",
            "מה שמך? ":"name",
            "לאיזה טיול תרצה להצטרף?":"hikes",
            "מהיכן אתה מגיע לטיול?":"comes from",
            "להיכן אתה חוזר אחרי הטיול?":"returns to",
            "האם אתה צריך טרמפ או מגיע ברכב?":"car/ride",
            "כמה מקומות פנויים יש לך?":"available places",
            "מה מספר הטלפון שלך?":"phone number",
            "האם שריינת את התאריך לטיול?":"saved the date",
            "אתה רוצה לשתף מהם החששות שלך?":"i fear of",
            "האם אתה רוצה לשתף בן כמה אתה?":"share my age",
            "בן כמה אתה?":"age",
            "האם מצטרפים אתך לטיול חברים נוספים (גייז כמובן)?":"friends joining",
            "שם וגיל של חבר שמצטרף":"friend1",
            "שם וגיל של חבר שני שמצטרף":"friend2",
            "שם וגיל של חבר שלישי שמצטרף":"friend3",
            "שם וגיל של חבר רביעי שמצטרף":"friend4",
            "האם החברים שריינו את התאריך לטיול?":"friendssavethedate",
            "אם עוד לא היית בטיולים, איך שמעת על הקבוצה?":"heard of the group",
            "אתה גיי נכון? (ולא נשוי לאישה)":"i'm gay",
            "תתנדב להביא כלי נגינה כלשהו או תנגן אם נביא? על מה?":"plays on",
            "יש פעילות כלשהי שהיית רוצה להעביר או לארגן בשביל הקבוצה?":"can organize",
            "אשמח לקבל פרטים על הטיולים":"get updates",
            "האחריות על כל מה שקורה בטיול היא עליי בלבד. מצבי הרפואי תקין, ואם ארגיש לא טוב איידע את החבר שמוביל את הטיול. ייתכן שרמת הקושי של הטיול תהיה קלה או קשה יותר מהצפוי ובהתאם הזמנים עשויים להתקצר או להתארך. אני יודע מה אני צריך להביא לטיול ומבין שייתכן שלא אוכל להצטרף בלי הציוד המתאים. האחריות על הציוד שלי היא שלי בלבד.\nאני מודע לכך שאני מצטרף לטיול עם חברים. הטיול אינו \"טיול מאורגן\", אלא בילוי חברי ללא הדרכה או ליווי מקצועי כלשהו. חברים מהקבוצה מתנדבים להזמין את הקבוצה לטיול ללא תשלום או תמורה.":"i approve",
            "What is your name?":"name",
            "To which hike do you with to join?":"hikes",
            "Where from are you coming to the hike?":"comes from",
            "Where do you return to after the hike?":"returns to",
            "Do you need a ride or come with a car?":"car/ride",
            "How many available space do you have?":"available places",
            "What is your phone number?":"phone number",
            "Have you saved the date of the hike?":"saved the date",
            "Do you want to share your concerns?":"i fear of",
            "Would you like to share your age?":"share my age",
            "How old are you?":"age",
            "Would additional gay friends join the hike with you?":"friends joining",
            "Name and age of gay friend that join the hike with you":"friend1",
            "Name and age of second gay friend that join the hike with you":"friend2",
            "Name and age of third gay friend that join the hike with you":"friend3",
            "Name and age of fourth gay friend that join the hike with you":"friend4",
            "Have the friends saved the date of the hike?":"friendssavethedate",
            "If you didn't join us yet, how did you hear about the hiking group?":"heard of the group",
            "Your'e gay, right? (and not married to a women)":"i'm gay",
            "Will you volunteer to bring a musical instrument or play at it if we would bring it? Which?":"plays on",
            "Any activity you would like to transfer or organize for the group?":"can organize",
            "I would love to receive updates about the hikes":"get updates",
            "The responsibility for everything that happens on the hike is solely mine. My medical condition is good and if I feel unwell I will let the group member that leads that hike to know. The difficulty of the hike may be easier or harder than expected and according the times may be shortened or lengthened. I know what I need to bring on the hike and understand that I might not be able to join without the right equipment. The responsibility for my equipment is solely mine\nI am aware that I am joining a hike with friends. The hike is not an ֿ\"organized hike\", but a friend's pastime without any professional guidance or accompaniment. Members of the group volunteer to invite the group on a hike without any payment.":"i approve",
        };

        var formObj = {};

        for (var property in formParams) {
            if (req.body.hasOwnProperty(property)) {
                if (typeof formObj[formParams[property]] === 'undefined' || formObj[formParams[property]] == "") {
                    formObj[formParams[property]] = req.body[property];
                }
                if (formObj[formParams[property]][0] == '"') {
                    formObj[formParams[property]] = formObj[formParams[property]].substr(1);
                    formObj[formParams[property]] = formObj[formParams[property]].substr(0, formObj[formParams[property]].length - 1);
                }
            }
        }
        console.log("formobj: " + JSON.stringify(formObj));

        var phonenumber = formObj["phone number"];
        phonenumber = tools.normalize_phonenumber(phonenumber);

        formObj.link = formObj.link.substr(formObj.link.lastIndexOf("edit2=") + 6);
        formObj.selectedhikes = [];
        if (typeof formObj.hikes !== 'undefined') {
            if (formObj.hikes[0] == '"') {
                formObj.selectedhikes = JSON.parse('['+formObj.hikes+']');
            }
            else {
                if (formObj.hikes[0] == '[') {
                    formObj.selectedhikes = JSON.parse(formObj.hikes);
                }
                else {
                    formObj.selectedhikes = JSON.parse('["'+formObj.hikes+'"]');
                }
            }
        }
        
        formObj.hikes = formObj.selectedhikes.join("\n");
        if (typeof formObj.friendssavethedate !== 'undefined') {
            if (formObj.friendssavethedate.indexOf("[") == -1) {
                formObj.friendssavethedate = JSON.parse('['+formObj.friendssavethedate+']');
            }
            else {
                formObj.friendssavethedate = JSON.parse(formObj.friendssavethedate);
            }
        }
        formObj.friendsdetails = [];

        for (let index = 0; typeof formObj.friendssavethedate !== 'undefined' && index < formObj.friendssavethedate.length; index++) {
            var savesthedate = formObj.friendssavethedate[index];
            if (formObj["friend" + (index + 1)] != "" && 
                typeof savesthedate !== 'undefined' && 
                savesthedate != null && savesthedate != "" &&
                savesthedate != "Not relevant" && savesthedate != "לא רלוונטי") {
                var friendname = formObj["friend" + (index + 1)];
                var friendage = friendname.match(/\d+/g);
                if (friendage) {
                    if (typeof friendage !== 'string') {
                        friendage = friendage[0];
                    }
                    friendname = friendname.substr(0, friendname.length - friendage.length);
                    hyphenindex = friendname.indexOf("-");
                    if (hyphenindex != -1) {
                        friendname = friendname.substr(0, hyphenindex).trim();
                    }
                }
                formObj.friendsdetails.push({
                    name: friendname,
                    age: friendage,
                    savesthedate: savesthedate,
                });
            }
        }

        formObj["friends joining"] = tools.friendstext_from_friendsdetails(formObj.friendsdetails);

        if (formObj["get updates"] !== 'undefined' && formObj["get updates"] != null) {
            mail.joinEmailAndWhatsAppUpdates(
                formObj["name"], formObj["email"], formObj["phone number"], formObj["get updates"]);    
        }

        dbservices.gethikes(res)
        .then(docs => {
            formObj.selectedhikes = tools.remove_hikes_notinlist(formObj.selectedhikes, docs);
            formObj.selectedhikes = tools.remove_past_hikes(formObj.selectedhikes);

            console.log("formobj2: " + JSON.stringify(formObj));

            dbservices.getlastregisterbyphonenumber(res, phonenumber)
            .then(doc => {
                if (typeof(doc) === 'undefined' || doc == null) {
                    var nowdate = new Date();
                    var editforms = {};
                    for (let index = 0; index < formObj.selectedhikes.length; index++) {
                        const hike = formObj.selectedhikes[index];
                        var hikedate = hike.match(/\d{1,2}\.\d{1,2}\.\d{2}/g);
                        if (hikedate != null) {
                            hikedate = hikedate[0];
                            hikedate = hikedate.replace(/\./g,"_");
                            editforms[hikedate] = {
                                "car/ride": formObj["car/ride"],
                                "plays on": formObj["plays on"],
                                "comes from": formObj["comes from"],
                                "returns to": formObj["returns to"],
                                "can organize": formObj["can organize"],
                                "saved the date": formObj["saved the date"],
                                "friends joining": formObj["friends joining"],
                                "available places": formObj["available places"],
                                friendsdetails: formObj.friendsdetails,
                                link: formObj.link,
                                "hikes": formObj.selectedhikes,
                            };
                        }
                    }
                    formObj.hikeseditforms = editforms;
                    formObj.lastageupdate = nowdate;

                    var registerObj = {
                        name: formObj.name,
                        email: formObj.email,
                        selectedhikes: formObj.selectedhikes,
                        "phone number": formObj["phone number"],
                        "share my age": formObj["share my age"],
                        age: formObj.age,
                        "i'm gay": formObj["i'm gay"],
                        "heard of the group": formObj["heard of the group"],
                        hikeseditforms: formObj.hikeseditforms,
                        lastageupdate: formObj.lastageupdate,
                        "car/ride": formObj["car/ride"],
                        "plays on": formObj["plays on"],
                        "comes from": formObj["comes from"],
                        "returns to": formObj["returns to"],
                        "can organize": formObj["can organize"],
                        "saved the date": formObj["saved the date"],
                        "i fear of": formObj["i fear of"],
                        "friends joining": formObj["friends joining"],
                        "available places": formObj["available places"],
                        friendsdetails: formObj.friendsdetails,
                        "i approve": formObj["i approve"],
                    };
                    console.log("registerObj: " + JSON.stringify(registerObj));
                    dbservices.insertnewlastregister(res, registerObj)
                    .then(() => {
                        res.status(200).json("success");
                    })
                    .catch(rejection => {
                        logservices.logRejection(rejection);
                    });
                }
                else {
                    doc.selectedhikes = tools.remove_hikes_notinlist(doc.selectedhikes, docs);
                    doc.selectedhikes = tools.remove_past_hikes(doc.selectedhikes);
                    var nowdate = new Date();

                    var savedthedate = doc["saved the date"];
                    var editforms = {};

                    for (var editform in doc.hikeseditforms) {
                        if (!tools.is_past_date(editform)) {
                            editforms[editform] = doc.hikeseditforms[editform];
                        }
                    }

                    var allhikes = doc.selectedhikes;
                    for (let index = 0; index < formObj.selectedhikes.length; index++) {
                        const hike = formObj.selectedhikes[index];
                        if (allhikes.indexOf(hike) == -1) {
                            allhikes.push(hike);
                        }
                        var hikedate = hike.match(/\d{1,2}\.\d{1,2}\.\d{2}/g);
                        if (hikedate != null) {
                            hikedate = hikedate[0];
                            hikedate = hikedate.replace(/\./g,"_");
                            editforms[hikedate] = {
                                "car/ride": formObj["car/ride"],
                                "plays on": formObj["plays on"],
                                "comes from": formObj["comes from"],
                                "returns to": formObj["returns to"],
                                "can organize": formObj["can organize"],
                                "saved the date": formObj["saved the date"],
                                "friends joining": formObj["friends joining"],
                                "available places": formObj["available places"],
                                friendsdetails: formObj.friendsdetails,
                                link: formObj.link,
                                "hikes": formObj.selectedhikes,
                            };
                        }
                    }

                    for (let index = 0; index < doc.selectedhikes.length; index++) {
                        const dochike = doc.selectedhikes[index];
                        var hikedate = dochike.match(/\d{1,2}\.\d{1,2}\.\d{2}/g);
                        if (hikedate != null) {
                            hikedate = hikedate[0];
                            hikedate = hikedate.replace(/\./g,"_");
                            if (typeof editforms[hikedate] !== 'undefined' && 
                                editforms[hikedate].link == formObj.link && 
                                formObj.selectedhikes.indexOf(dochike) == -1) {
                                    console.log("removed hike " + dochike + " with link " + formObj.link);
                                    delete editforms[hikedate];
                                    allhikes.splice(allhikes.indexOf(dochike),1);
                            }
                        }
                    }

                    if (formObj["saved the date"] != "I planned joining the hike but I now have to cancel" && 
                        formObj["saved the date"] != "תכננתי לבוא ואני נאלץ לבטל הגעה") {
                        savedthedate = formObj["saved the date"];
                    }

                    formObj.hikeseditforms = editforms;
                    formObj.lastageupdate = nowdate;

                    var registerObj = {
                        name: formObj.name,
                        email: formObj.email,
                        selectedhikes: allhikes,
                        "phone number": formObj["phone number"],
                        "share my age": formObj["share my age"],
                        age: formObj.age,
                        "i'm gay": formObj["i'm gay"],
                        "heard of the group": formObj["heard of the group"],
                        hikeseditforms: formObj.hikeseditforms,
                        lastageupdate: formObj.lastageupdate,
                        "car/ride": formObj["car/ride"],
                        "plays on": formObj["plays on"],
                        "comes from": formObj["comes from"],
                        "returns to": formObj["returns to"],
                        "can organize": formObj["can organize"],
                        "saved the date": savedthedate,
                        "i fear of": formObj["i fear of"],
                        "friends joining": formObj["friends joining"],
                        "available places": formObj["available places"],
                        friendsdetails: formObj.friendsdetails,
                        "i approve": formObj["i approve"],
                    };
                    console.log("registerObj: " + JSON.stringify(registerObj));

                    dbservices.replaceonelastregister(res, phonenumber, registerObj)
                    .then(() => {
                        res.status(200).json("success");
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
});

app.delete("/api/lastregister", function(req, res) {
    if (tools.checkspecialpwd(res, req.query.pwd, req.query.specialpwd)) {
        dbservices.deletealllastregisters(res)
        .then(() => {
            res.status(200).json("success");
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

/*  "/api/lastregister/:phone"
*    PATCH: restore hiker's last register details by phone and register to a new hike 
*    PUT: restore hiker's last register details by phone and choose a hike to edit or cancel 
*    POST: restore hiker's specific hike register details by phone 
*    DELETE: deletes one hiker's last register details by phone
*/

app.patch("/api/lastregister/:phone", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, req.query.pwd)) {
        var phonenumber = req.params.phone;
        phonenumber = tools.normalize_phonenumber(phonenumber);

        dbservices.getlastregisterbyphonenumber(res, phonenumber)
        .then(doc => {

            var conversation_reply;
            var language = tools.set_language(memory);

            if (!doc) {
                memory.stage = "haslastregister";
                conversation_reply = 
                    replies.get_reply("NO_ANSWER",language,null,memory);   
                res.status(200).json(conversation_reply);
            }
            else if (typeof(doc) !== 'undefined' && doc != null) {

                memory.registertohikes = doc;

                var paramstorestore = {
                    "email":"email2",
                    "name":"myname",
                    "hikeseditforms":"hikeseditforms",
                    "comes from":"comefrom2",
                    "returns to":"returnto2",
                    "car/ride":"comewithcar2",
                    "available places":"availableplaces",
                    "phone number":"phonenumber",
                    "saved the date":"savedthedate2",
                    "i fear of":"ifearof2",
                    "share my age":"shareage2",
                    "age":"age",
                    "friends joining":"friendstext",
                    "heard of the group":"howdidihear2",
                    "i'm gay":"isgay2",
                    "plays on":"playson2",
                    "can organize":"volunteer2",
                    "i approve": "iapprove",
                }
        
                for (var property in paramstorestore) {
                    if (paramstorestore.hasOwnProperty(property)) {
                        memory[paramstorestore[property]] = memory.registertohikes[property];
                    }
                    else {
                        memory[paramstorestore[property]] = "";
                    }
                }
                memory.hikes = memory.registertohikes.selectedhikes.join("\n");

                memory.friendsdetails = memory.registertohikes.friendsdetails;
                memory.selectedhikes = memory.registertohikes.selectedhikes;
                memory.selectedhikes = tools.remove_past_hikes(memory.selectedhikes);
                memory.lastageupdate = memory.registertohikes.lastageupdate;
                memory.friendstext = tools.friendstext_from_friendsdetails(memory.friendsdetails);
        
                dbservices.gethikes(res)
                .then(docs => {

                    console.log("lastregister docs(hikes) " + JSON.stringify(docs));
                    docs = tools.sort_hikes(docs);
                    console.log("lastregister docs(hikes) after sort " + JSON.stringify(docs));
                    var selectedHikes = [];
                    if (typeof memory.selectedhikes !== 'undefined' && memory.selectedhikes != null &&
                        memory.selectedhikes != "") {
                        selectedHikes = memory.selectedhikes;
                    }
                    docs = tools.remove_past_hikes(docs);
                    console.log("lastregister docs(hikes) remove past " + JSON.stringify(docs));

                    selectedHikes = tools.remove_past_hikes(selectedHikes);
                    selectedHikes = tools.remove_hikes_notinlist(selectedHikes, docs);
                    console.log("lastregister selectedHikes " + JSON.stringify(selectedHikes));
                    selectedHikes = tools.sort_hikes(selectedHikes);
                    console.log("lastregister selectedHikes sort_hikes " + JSON.stringify(selectedHikes));
                    selectedHikes = tools.only_hikes_in_lang(docs, selectedHikes, language);
                    console.log("lastregister selectedHikes only_hikes_in_lang " + JSON.stringify(selectedHikes));
                    var selectHike = "";
                    if (typeof memory.selecthike !== 'undefined' && memory.selecthike != null ) {
                        var memorySelectHike = memory.selecthike.raw;
                        console.log("lastregister docs(hikes) b4 find " + JSON.stringify(docs));

                        selectHike = tools.findhike(docs, memorySelectHike);
    
                        if (selectHike != "") {
                            switch (language) {
                                case "he":
                                    var indexhe = selectedHikes.indexOf(selectHike.hikenamehebrew);
                                    var indexen = selectedHikes.indexOf(selectHike.hikenameenglish);
                                    if (indexhe == -1 && indexen == -1) {
                                        selectedHikes.push(selectHike.hikenamehebrew);
                                    }
                                    else {
                                        selectedHikes.splice(index, 1);
                                    }
                                    break;
                                case "en":
                                    var indexhe = selectedHikes.indexOf(selectHike.hikenamehebrew);
                                    var indexen = selectedHikes.indexOf(selectHike.hikenameenglish);
                                    if (indexhe == -1 && indexen == -1) {
                                        selectedHikes.push(selectHike.hikenameenglish);
                                    }
                                    else {
                                        selectedHikes.splice(index, 1);
                                    }
                                    break;
                                default:
                                    break;
                            }
                        }
                    }
                    if (selectedHikes.length == 0) {
                        memory.emptyhikes = "yes";
                    }
                    else {
                        memory.emptyhikes = selectedHikes.join("\n");
                    }
                    memory.selectedhikes = selectedHikes;

                    if (selectedHikes.length > 0) {
                        var conversation_reply = replies.get_reply("HIKES_SELECTED_INITIAL",language,
                            [selectedHikes.join("\n")],memory);
                    }
                    else {
                        var conversation_reply = replies.get_reply("REGISTERED_NO_HIKE",language,null,memory);
                    }
                    
                    if (memory.stage == "haslastregister_true" || memory.stage == "haslastregister") {
                        memory.stage = "wanttomodify_selecthikes";
                        conversation_reply = 
                            register.setAvailableHikesReplyBut(conversation_reply, docs, language, selectedHikes);
                    }
                    // sapchatbot.getconversations(res, req.body.conversation.id, phonenumber)
                    // .then(() => {
                    //     res.status(200).json(conversation_reply);
                    // })
                    // .catch(rejection => {
                    //     logservices.logRejection(rejection);
                    // });
                    res.status(200).json(conversation_reply);
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
});

app.put("/api/lastregister/:phone", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, req.query.pwd)) {
        var phonenumber = req.params.phone;
        phonenumber = tools.normalize_phonenumber(phonenumber);
        dbservices.getlastregisterbyphonenumber(res, phonenumber)
        .then(doc => {
            var conversation_reply;
            var language = tools.set_language(memory);

            if (typeof(doc) !== 'undefined' && doc != null) {
                memory.stage = "wanttomodify_hiketomodify";
                memory.registertohikes = doc;
                memory.emptyhikes = doc.selectedhikes.join("\n");
                memory.registertohikes.hikes = memory.emptyhikes;
                memory.selectedhikes = doc.selectedhikes;
                memory.selectedhikes = tools.remove_past_hikes(memory.selectedhikes);
                memory.lastageupdate = doc.lastageupdate;
                memory.hikeseditforms = memory.registertohikes.hikeseditforms;

                var paramstorestore = {
                    "email":"email2",
                    "name":"myname",
                    "hikeseditforms":"hikeseditforms",
                    "comes from":"comefrom2",
                    "returns to":"returnto2",
                    "car/ride":"comewithcar2",
                    "available places":"availableplaces",
                    "phone number":"phonenumber",
                    "saved the date":"savedthedate2",
                    "i fear of":"ifearof2",
                    "share my age":"shareage2",
                    "age":"age",
                    "friends joining":"friendstext",
                    "heard of the group":"howdidihear2",
                    "i'm gay":"isgay2",
                    "plays on":"playson2",
                    "can organize":"volunteer2",
                    "i approve": "iapprove",
                }

                for (var property in paramstorestore) {
                    if (paramstorestore.hasOwnProperty(property)) {
                        memory[paramstorestore[property]] = memory.registertohikes[property];
                    }
                    else {
                        memory[paramstorestore[property]] = "";
                    }
                }
        
                dbservices.gethikes(res)
                .then(docs => {
                    docs = tools.sort_hikes(docs);
                    var selectedHikes = memory.registertohikes.hikes.split("\n");
                    selectedHikes = tools.remove_past_hikes(selectedHikes);
                    selectedHikes = tools.remove_hikes_notinlist(selectedHikes, docs);
                    selectedHikes = tools.sort_hikes(selectedHikes);
                    selectedHikes = tools.only_hikes_in_lang(docs, selectedHikes, language);
                    memory.emptyhikes = selectedHikes.join("\n");
                    memory.selectedhikes = selectedHikes;

                    if (selectedHikes.length > 1) {
                        conversation_reply = replies.get_reply("NO_ANSWER",language,null,memory); 
                        var title = replies.get_conversation_string("CHOOSE_HIKE_TO_EDIT", language);
                        conversation_reply = 
                            register.setAvailableHikesReply(conversation_reply, selectedHikes, language, title);
                    }
                    else if (selectedHikes.length == 1) {
                        if (memory.operation == "cancel") {
                            memory.stage = "wanttomodify_cancelhike";
                            memory.hiketoeditcancel2 = selectedHikes[0];
                            conversation_reply = replies.get_reply("NO_ANSWER",language,null,memory); 
                        }
                        else if (memory.operation == "edithike") {
                            memory.stage = "registertohikes_affectedhikes";
                            memory.hiketoeditcancel2 = selectedHikes[0];
                            conversation_reply = 
                                replies.get_reply("REGISTERTOHIKES_EDITINGHIKE",language,[selectedHikes[0]],memory); 
                        }
                    }
                    else {
                        delete memory.stage;
                        delete memory.operation;
                        conversation_reply = replies.get_reply("REGISTERED_NO_HIKE_SUGGEST",language,null,memory);
                    }
                    // sapchatbot.getconversations(res, req.body.conversation.id, phonenumber)
                    // .then(() => {
                    //     res.status(200).json(conversation_reply);
                    // })
                    // .catch(rejection => {
                    //     logservices.logRejection(rejection);
                    // });
                    res.status(200).json(conversation_reply);
                })
            }
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

app.post("/api/lastregister/:phone", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, req.query.pwd)) {
        var phonenumber = req.params.phone;
        phonenumber = tools.normalize_phonenumber(phonenumber);
        dbservices.getlastregisterbyphonenumber(res, phonenumber)
        .then(doc => {
            var conversation_reply;
            var language = tools.set_language(memory);

            if (typeof(doc) !== 'undefined' && doc != null) {
                var hiketoeditcancel = memory.hiketoeditcancel2;
                var hikeeditdate = hiketoeditcancel.match(/\d{1,2}\.\d{1,2}\.\d{2}/g)[0].replace(/\./g,"_");
                var thishikeobject = memory.hikeseditforms[hikeeditdate];
                console.log("hiketoeditcancel hikeeditdate " + hiketoeditcancel + " | " + hikeeditdate);
                console.log("thishikeobject " + JSON.stringify(thishikeobject));
                console.log("memory " + JSON.stringify(memory));

                var specificparamstorestore = {
                    "comes from":"comefrom2",
                    "returns to":"returnto2",
                    "car/ride":"comewithcar2",
                    "available places":"availableplaces",
                    "saved the date":"savedthedate2",
                    "plays on":"playson2",
                    "can organize":"volunteer2",
                }

                for (var property in specificparamstorestore) {
                    if (specificparamstorestore.hasOwnProperty(property)) {
                        memory[specificparamstorestore[property]] = thishikeobject[property];
                    }
                }

                memory.friendsdetails = thishikeobject.friendsdetails;
                memory.friendstext = tools.friendstext_from_friendsdetails(memory.friendsdetails);

                var affectedhikes = JSON.parse(JSON.stringify(thishikeobject.hikes));
                console.log("affectedhikes " + JSON.stringify(affectedhikes));
        
                dbservices.gethikes(res)
                .then(docs => {
                    docs = tools.sort_hikes(docs);

                    for (let index = 0; index < affectedhikes.length; index++) {
                        var hike = affectedhikes[index];
                        var hiketoeditcancelindex = hike.indexOf(hiketoeditcancel);
                        var selectHike = null;
                        selectHike = tools.findhike(docs, hike);

                        if (selectHike == null || hiketoeditcancelindex != -1) {
                            affectedhikes.splice(index,1);
                            index--;
                        }
                    }
                    console.log("affectedhikes2 " + JSON.stringify(affectedhikes));

                    affectedhikes = affectedhikes.join("\n");
                    var selectedHikes = memory.registertohikes.hikes.split("\n");
                    memory.registertohikes.selectedhikes = selectedHikes;
                    memory.emptyhikes = selectedHikes.join("\n");
                    memory.selectedhikes = selectedHikes;
                    if (affectedhikes == "") {
                        conversation_reply = 
                            replies.get_reply("NO_ANSWER",language,null,memory);    
                    }
                    else {
                        conversation_reply = 
                            replies.get_reply("AFFECTED_HIKES",language,[hiketoeditcancel,affectedhikes],memory);    
                    }
                    res.status(200).json(conversation_reply);
                })
            }
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

app.delete("/api/lastregister/:phone", function(req, res) {
    if (tools.checkpwd(res, req.query.pwd)) {
        var phonenumber = req.params.phone;
        phonenumber = tools.normalize_phonenumber(phonenumber);
        dbservices.deleteonelastregister(res, phonenumber)
        .then(doc => {
            res.status(200).json("success");
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

/*  "/api/haslastregister/:phone"
*    PATCH: checks whether hiker has last register details by phone number
*/

app.patch("/api/haslastregister/:phone", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, req.query.pwd)) {
        var phonenumber = req.params.phone;
        var language = tools.set_language(memory);

        phonenumber = tools.normalize_phonenumber(phonenumber);
        memory.phonenumber = phonenumber;

        dbservices.getlastregisterbyphonenumber(res, phonenumber)
        .then(doc => {
            var conversation_reply = 
            replies.get_reply("NO_ANSWER",language,null,memory);

            if (typeof(doc) !== 'undefined' && doc != null) {
                memory.stage = "haslastregister_true";
                res.status(200).json(conversation_reply);
            }
            else {
                dbservices.gethikes(res)
                .then(hikedocs => {
                    if (memory.operation && memory.operation != "newhike") {
                        conversation_reply = 
                        replies.get_reply("ROBOT_CONFUSED_EDITHIKE_NOT_REGISTERED_TO_HIKES",language,null,memory);
                    }

                    if (memory.stage != "whichhikesregistered_phone") {
                        var stages = {
                            "myname":"haslastregister_false",
                            "isgay2":"registertohikes_isgay",
                            "email2":"registertohikes_getemail",
                            "selectedhikes":"registertohikes_selecthikes",
                            "comefrom2":"registertohikes_comefrom",
                            "returnto2":"registertohikes_returnto",
                            "comewithcar2":"registertohikes_comewithcar",
                            "availableplaces":"registertohikes_availableplaces",
                            "savedthedate2":"registertohikes_savedthedate",
                            "ifearof2":"registertohikes_whatyoufearof",
                            "shareage2":"registertohikes_shareage",
                            "age":"registertohikes_age",
                            "dofriendsjoin2":"registertohikes_dofriendsjoin",
                            "friendname":"registertohikes_friendsname",
                            "friendage":"registertohikes_friendsage",
                            "friendsavesthedate":"registertohikes_friendssavedthedate",
                            "howdidihear2":"registertohikes_howdidihear",
                            "playson2":"registertohikes_playson",
                            "volunteer2":"registertohikes_volunteer",
                            "iapprove":"registertohikes_selfresponsibility",
                        }

                        var keys = {
                            "haslastregister_false":"REGISTERTOHIKES_NAME",
                            "registertohikes_isgay":"REGISTERTOHIKES_ISGAY",
                            "registertohikes_getemail":"REGISTERTOHIKES_EMAIL",
                            "registertohikes_selecthikes":"WHICH_HIKE_REGISTER",
                            "registertohikes_comefrom":"REGISTERTOHIKES_COMEFROM",
                            "registertohikes_returnto":"REGISTERTOHIKES_RETURNTO",
                            "registertohikes_comewithcar":"REGISTERTOHIKES_COMEWITHCAR",
                            "registertohikes_availableplaces":"REGISTERTOHIKES_AVAILABLEPLACES",
                            "registertohikes_savedthedate":"REGISTERTOHIKES_SAVEDTHEDATE",
                            "registertohikes_whatyoufearof":"REGISTERTOHIKES_FEAROF",
                            "registertohikes_shareage":"REGISTERTOHIKES_SHAREAGE",
                            "registertohikes_age":"REGISTERTOHIKES_AGE",
                            "registertohikes_dofriendsjoin":"REGISTERTOHIKES_DOFRIENDSJOIN",
                            "registertohikes_friendsname":"REGISTERTOHIKES_FRIENDSNAME",
                            "registertohikes_friendsage":"REGISTERTOHIKES_FRIENDSAGE",
                            "registertohikes_friendssavedthedate":"REGISTERTOHIKES_FRIENDSAVEDTHEDATE",
                            "registertohikes_howdidihear":"REGISTERTOHIKES_HOWDIDIHEAR",
                            "registertohikes_playson":"REGISTERTOHIKES_PLAYSON",
                            "registertohikes_volunteer":"REGISTERTOHIKES_VOLUNTEER",
                            "registertohikes_selfresponsibility":"REGISTERTOHIKES_SELFRESPONSIBILITY",
                        }

                        var previousvaluesdependencies = {
                            "haslastregister_false": [],
                            "registertohikes_isgay": [],
                            "registertohikes_getemail": [],
                            "registertohikes_selecthikes": [],
                            "registertohikes_comefrom": [],
                            "registertohikes_returnto": [],
                            "registertohikes_comewithcar": [],
                            "registertohikes_availableplaces": ["i come in my car", "i need a ride but i do have a car", 
                                "i will rent a car if there will be hitchhikers", 
                                "אני מגיע ברכב", "אני צריך טרמפ (אבל יש לי רכב)", "אשכור רכב אם יהיו טרמפיסטים"],
                            "registertohikes_savedthedate": [],
                            "registertohikes_whatyoufearof": ["i save the date but i do have concerns", 
                                "אני שומר את התאריך הזה פנוי, אבל יש לי חששות לבוא לטיול"],
                            "registertohikes_shareage": [],
                            "registertohikes_age": ["yes", "כן"],
                            "registertohikes_dofriendsjoin": [],
                            "registertohikes_friendsname": ["yes", "כן"],
                            "registertohikes_friendsage": ["yes", "כן"],
                            "registertohikes_friendssavedthedate": ["yes", "כן"],
                            "registertohikes_howdidihear": [],
                            "registertohikes_playson": [],
                            "registertohikes_volunteer": [],
                            "registertohikes_selfresponsibility": [],
                        }

                        var prevvariable = "myname";
                        console.log("memory " + JSON.stringify(memory));
                        for (var memory_variable in stages) {
                            console.log("memory_variable " + memory_variable + " prevvariable " + prevvariable + " " + 
                                memory[prevvariable]);
                            if (!memory[memory_variable]) {
                                var prevvaluedependency = previousvaluesdependencies[stages[memory_variable]];
                                if (prevvaluedependency != null && prevvaluedependency.length > 0 && 
                                    prevvaluedependency.indexOf(memory[prevvariable].toLowerCase()) == -1) {
                                    continue;
                                }
                                if (memory.friendsdetails && memory.friendsdetails.length > 0 && memory_variable == "friendname") { 
                                    continue;
                                }
                                else if ((memory_variable == "friendage" && !memory.friendname) ||
                                    (memory_variable == "friendsavesthedate" && !memory.friendage)) {
                                        continue;
                                }
                                memory.stage = stages[memory_variable];
                                var buttons = replies.get_conversation_buttons(keys[memory.stage], language);
                                var reply_string = replies.get_conversation_string(keys[memory.stage],language);
                                conversation_reply = replies.push_to_reply(conversation_reply, reply_string, buttons);
                                break;
                            }
                            else if (JSON.stringify(memory[memory_variable]) == "[]") {
                                memory.stage = stages[memory_variable];
                                conversation_reply = 
                                    register.setAvailableHikesReplyBut(conversation_reply, hikedocs, language, memory["selectedhikes"]);
                                break;
                            }
                            prevvariable = memory_variable;
                        }
                        if (memory.stage == "haslastregister") {
                            memory.stage = "registertohikes_modify";
                        }
                        memory.operation = "newhike";
                    }

                    console.log("memory.stage " + JSON.stringify(memory.stage));
                    // sapchatbot.getconversations(res, req.body.conversation.id, phonenumber)
                    // .then(() => {
                    //     res.status(200).json(conversation_reply);
                    // })
                    // .catch(rejection => {
                    //     logservices.logRejection(rejection);
                    // });
                    res.status(200).json(conversation_reply);
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
});

/*  "/api/registertohikes"
*    POST: send a google form response of hikes' register
*    PUT: cancel or edit registration to a hike
*/

app.post("/api/registertohikes", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, req.query.pwd)) {
        var language = tools.set_language(memory);
        var registertohikes_lang = "עברית";
        if (language == "en") {
            var registertohikes_lang = "English";
        }

        var registerparams = {
            "VAR_LANGUAGE":"",
            "VAR_EDIT_LINK":null, 
            "VAR_EMAIL":"",
            "VAR_NAME":"",
            "VAR_NEW_HIKES_LIST":[],
            "VAR_WHERE_FROM":"",
            "VAR_WHERE_TO":"",
            "VAR_HAVE_A_CAR":"",
            "VAR_AVAILABLE_PLACES":"",
            "VAR_PHONENUMBER":"",
            "VAR_SAVED_THE_DATE":"",
            "VAR_I_FEAR_OF":"",
            "VAR_SHARE_MY_AGE":"",
            "VAR_MY_AGE":"",
            "VAR_COME_WITH_FRIENDS":"",
            "VAR_FRIEND1_NAME":"",
            "VAR_FRIEND2_NAME":"",
            "VAR_FRIEND3_NAME":"",
            "VAR_FRIEND4_NAME":"",
            "VAR_FRIEND1_SAVE_THE_DATE":"",
            "VAR_FRIEND2_SAVE_THE_DATE":"",
            "VAR_FRIEND3_SAVE_THE_DATE":"",
            "VAR_FRIEND4_SAVE_THE_DATE":"",
            "VAR_ARE_YOU_GAY":"",
            "VAR_BEEN_IN_HIKES":"",
            "VAR_PLAYSON":"",
            "VAR_ORGANIZE":"",
        };

        var memoryparamsheb = {
            "email":"VAR_EMAIL",
            "name":"VAR_NAME",
            "comes from":"VAR_WHERE_FROM",
            "returns to":"VAR_WHERE_TO",
            "car/ride":"VAR_HAVE_A_CAR",
            "available places":"VAR_AVAILABLE_PLACES",
            "phone number":"VAR_PHONENUMBER",
            "saved the date":"VAR_SAVED_THE_DATE",
            "i fear of": "VAR_I_FEAR_OF",
            "share my age":"VAR_SHARE_MY_AGE",
            "age":"VAR_MY_AGE",
            "heard of the group":"VAR_BEEN_IN_HIKES",
            "i'm gay":"VAR_ARE_YOU_GAY",
            "plays on":"VAR_PLAYSON",
            "can organize":"VAR_ORGANIZE",
        }

        console.log("memory " + JSON.stringify(memory));

        var phonenumber = memory.registertohikes["phone number"];

        phonenumber = tools.normalize_phonenumber(phonenumber);
        dbservices.getlastregisterbyphonenumber(res, phonenumber)
        .then(doc => {
            registerparams["VAR_LANGUAGE"] = registertohikes_lang;
            for (var property in memory.registertohikes) {
                if (memory.registertohikes.hasOwnProperty(property) && memory.registertohikes[property] != null) {
                    registerparams[memoryparamsheb[property]] = memory.registertohikes[property];
                }
            }

            registerparams["VAR_COME_WITH_FRIENDS"] = "לא";
            if (typeof memory.friendsdetails !== 'undefined') {
                for (let index = 0; index < memory.friendsdetails.length && index < 4; index++) {
                    registerparams["VAR_COME_WITH_FRIENDS"] = "כן";
                    const friend = memory.friendsdetails[index];
                    var friend_index = index+1;
                    if (friend.age && friend.age != "0") {
                        registerparams["VAR_FRIEND"+friend_index+"_NAME"] = friend.name + " - " + friend.age;
                    }
                    else {
                        registerparams["VAR_FRIEND"+friend_index+"_NAME"] = friend.name;
                    }
                    registerparams["VAR_FRIEND"+friend_index+"_SAVE_THE_DATE"] = 
                        friend.savesthedate.replace("כן", "שומר את התאריך").replace("אולי הוא יבוא", "אולי יצטרף")
                            .replace("Yes", "שומר את התאריך").replace("He may join", "אולי יצטרף");

                }
                registerparams.friendsdetails = memory.friendsdetails;
            }

            var newhikes;
            var editforms = {};
            if (!memory.selectedhikes) {
                memory.selectedhikes = [];
            }
            if (doc && doc.hikeseditforms) {
                newhikes = [];
                for (let index = 0; index < memory.selectedhikes.length; index++) {
                    const hike = memory.selectedhikes[index];
                    var hikedate = hike.match(/\d{1,2}\.\d{1,2}\.\d{2}/g)[0];
                    hikedate = hikedate.replace(/\./g,"_");
                    if (doc.hikeseditforms[hikedate]) {
                        editforms[hikedate] = doc.hikeseditforms[hikedate];
                    }
                    else {
                        editforms[hikedate] = {
                            "car/ride": memory.registertohikes["car/ride"],
                            "plays on": memory.registertohikes["plays on"],
                            "comes from": memory.registertohikes["comes from"],
                            "returns to": memory.registertohikes["returns to"],
                            "can organize": memory.registertohikes["can organize"],
                            "saved the date": memory.registertohikes["saved the date"],
                            "friends joining": memory.registertohikes["friends joining"],
                            "available places": memory.registertohikes["available places"],
                            friendsdetails: memory.friendsdetails,
                            link: "",
                            hikes: newhikes,
                        };
                        newhikes.push(hike);
                    }
                }
            }
            else {
                newhikes = memory.selectedhikes;
                for (let index = 0; index < memory.selectedhikes.length; index++) {
                    const hike = memory.selectedhikes[index];
                    var hikedate = hike.match(/\d{1,2}\.\d{1,2}\.\d{2}/g)[0];
                    hikedate = hikedate.replace(/\./g,"_");
                    editforms[hikedate] = {
                        "car/ride": memory.registertohikes["car/ride"],
                        "plays on": memory.registertohikes["plays on"],
                        "comes from": memory.registertohikes["comes from"],
                        "returns to": memory.registertohikes["returns to"],
                        "can organize": memory.registertohikes["can organize"],
                        "saved the date": memory.registertohikes["saved the date"],
                        "friends joining": memory.registertohikes["friends joining"],
                        "available places": memory.registertohikes["available places"],
                        friendsdetails: memory.friendsdetails,
                        link: "",
                        hikes: newhikes,
                    };
                }
            }
            memory.hikeseditforms = editforms;

            dbservices.gethikes(res)
            .then(hikedocs => {
                var hebrewhikenames = [];
                for (let indexhike = 0; indexhike < newhikes.length; indexhike++) {
                    const currhike = newhikes[indexhike];
                    findhike = tools.findhike(hikedocs, currhike);

                    console.log("currhike: " + currhike + " hikehebrew: " + findhike.hikenamehebrew);
                    if (findhike != null) {
                        hebrewhikenames.push(findhike.hikenamehebrew);
                    }
                }
                registerparams["VAR_NEW_HIKES_LIST"] = hebrewhikenames;

                var translations = [
                    {
                        paramname: "VAR_SAVED_THE_DATE",
                        values: [
                            {english: "Yes", hebrew: "כן"},
                            {english: "I could maybe join the hike", hebrew: "אולי אוכל לבוא לטיול, לא בטוח שאני פנוי"},
                            {english: "I save the date but I do have concerns", 
                                hebrew: "אני שומר את התאריך הזה פנוי, אבל יש לי חששות לבוא לטיול"},
                        ]
                    },
                    {
                        paramname: "VAR_HAVE_A_CAR",
                        values: [
                            {english: "I come in my car", hebrew: "אני מגיע ברכב"},
                            {english: "I need a ride", hebrew: "אני צריך טרמפ"},
                            {english: "I need a ride but I do have a car", hebrew: "אני צריך טרמפ (אבל יש לי רכב)"},
                            {english: "I already setuped with a friend I'm joining (I will write who it is in the form)", 
                                hebrew: "קבעתי כבר עם חבר אחר שאני מצטרף אליו (אפרט בהמשך הטופס מי זה)"},
                            {english: "I come in bus, a motorcycle or other", hebrew: "אני מגיע באוטובוס או אופנוע, אחר"},
                            {english: "I will rent a car if there will be hitchhikers", hebrew: "אשכור רכב אם יהיו טרמפיסטים"},
                        ]
                    }
                ];

                for (let indextranslate = 0; indextranslate < translations.length; indextranslate++) {
                    const translate = translations[indextranslate];
                    for (let indexval = 0; indexval < translate.values.length; indexval++) {
                        const val = translate.values[indexval];
                        if (registerparams[translate.paramname] == val.english) {
                            registerparams[translate.paramname] = val.hebrew;
                        }
                    }
                }

                var nowdate = new Date();
                memory.registertohikes.selectedhikes = memory.selectedhikes;
                memory.registertohikes.friendsdetails = memory.friendsdetails;
                memory.registertohikes.hikeseditforms = memory.hikeseditforms;

                if (!memory.registertohikes.lastageupdate) {
                    memory.registertohikes.lastageupdate = nowdate;
                }

                console.log("registerparams " + JSON.stringify(registerparams));
                console.log("memory " + JSON.stringify(memory));

                if (newhikes.length > 0) {
                    register.register_to_hikes(language, res, registerparams, memory);
                }
                else {
                    var conversation_reply = 
                        replies.get_reply("REGISTERED_TO_ALL_HIKES_CHOSEN",language,null,memory);
                    res.status(200).json(conversation_reply);
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
  });

  app.put("/api/registertohikes", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, memory.pwd)) {
        var language = tools.set_language(memory);
        var registertohikes_lang = "עברית";
        if (language == "en") {
            var registertohikes_lang = "English";
        }

        var registerparams = {
            "VAR_LANGUAGE":"",
            "VAR_EDIT_LINK":null, 
            "VAR_EMAIL":"",
            "VAR_NAME":"",
            "VAR_NEW_HIKES_LIST":[],
            "VAR_WHERE_FROM":"",
            "VAR_WHERE_TO":"",
            "VAR_HAVE_A_CAR":"",
            "VAR_AVAILABLE_PLACES":"",
            "VAR_PHONENUMBER":"",
            "VAR_SAVED_THE_DATE":"",
            "VAR_I_FEAR_OF":"",
            "VAR_SHARE_MY_AGE":"",
            "VAR_MY_AGE":"",
            "VAR_COME_WITH_FRIENDS":"",
            "VAR_FRIEND1_NAME":"",
            "VAR_FRIEND2_NAME":"",
            "VAR_FRIEND3_NAME":"",
            "VAR_FRIEND4_NAME":"",
            "VAR_FRIEND1_SAVE_THE_DATE":"",
            "VAR_FRIEND2_SAVE_THE_DATE":"",
            "VAR_FRIEND3_SAVE_THE_DATE":"",
            "VAR_FRIEND4_SAVE_THE_DATE":"",
            "VAR_ARE_YOU_GAY":"",
            "VAR_BEEN_IN_HIKES":"",
            "VAR_PLAYSON":"",
            "VAR_ORGANIZE":"",
        };

        var memoryparamsheb = {
            "email":"VAR_EMAIL",
            "name":"VAR_NAME",
            "phone number":"VAR_PHONENUMBER",
            "share my age":"VAR_SHARE_MY_AGE",
            "age":"VAR_MY_AGE",
            "heard of the group":"VAR_BEEN_IN_HIKES",
            "i'm gay":"VAR_ARE_YOU_GAY",
            "friends joining":"VAR_COME_WITH_FRIENDS",
            "comes from":"VAR_WHERE_FROM",
            "returns to":"VAR_WHERE_TO",
            "car/ride":"VAR_HAVE_A_CAR",
            "available places":"VAR_AVAILABLE_PLACES",
            "saved the date":"VAR_SAVED_THE_DATE",
            "i fear of": "VAR_I_FEAR_OF",
            "plays on":"VAR_PLAYSON",
            "can organize":"VAR_ORGANIZE",
        }

        if (memory.registertohikes.hikeseditforms) {
            memory.hikeseditforms = JSON.parse(JSON.stringify(memory.registertohikes.hikeseditforms));
        }

        if (memory.hiketoeditcancel2) {
            var hiketoeditcancel = memory.hiketoeditcancel2;
            var selectHike = null;
            selectHike = memory.selectedhikes.find(function(element) {
                var result = false;
                if (element.indexOf(hiketoeditcancel) != -1) {
                    result = true;
                }
                return result;
            });
            var hikecanceldate = hiketoeditcancel.match(/\d{1,2}\.\d{1,2}\.\d{2}/g)[0].replace(/\./g,"_");
            var editedage = memory.registertohikes.age;
            var thishikeobject = memory.hikeseditforms[hikecanceldate];
            registerparams.VAR_EDIT_LINK = thishikeobject.link;
    
            registerparams["VAR_LANGUAGE"] = registertohikes_lang;
            for (var property in memoryparamsheb) {
                if (memory.registertohikes.hasOwnProperty(property) && memory.registertohikes[property] != null) {
                    registerparams[memoryparamsheb[property]] = memory.registertohikes[property];
                }
            }
    
            registerparams["VAR_COME_WITH_FRIENDS"] = "לא";
            if (typeof memory.friendsdetails !== 'undefined') {
                for (let index = 0; index < memory.friendsdetails.length && index < 4; index++) {
                    registerparams["VAR_COME_WITH_FRIENDS"] = "כן";
                    const friend = memory.friendsdetails[index];
                    var friend_index = index+1;
                    if (friend.age && friend.age != "0") {
                        registerparams["VAR_FRIEND"+friend_index+"_NAME"] = friend.name + " - " + friend.age;
                    }
                    else {
                        registerparams["VAR_FRIEND"+friend_index+"_NAME"] = friend.name;
                    }
                    registerparams["VAR_FRIEND"+friend_index+"_SAVE_THE_DATE"] = 
                        friend.savesthedate.replace("כן", "שומר את התאריך").replace("אולי הוא יבוא", "אולי יצטרף")
                            .replace("Yes", "שומר את התאריך").replace("He may join", "אולי יצטרף");
    
                }
                registerparams.friendsdetails = memory.friendsdetails;
            }
    
            var nowdate = new Date();
            if (memory.hikeseditforms[hikecanceldate].age != editedage) {
                memory.registertohikes.lastageupdate = nowdate;
            }
    
            if (memory.registertohikes.lastageupdate) {
                previousdate = new Date(memory.registertohikes.lastageupdate);
                var difference = Math.floor((previousdate - nowdate) / (1000*60*60*24))
                if (difference > 364) {
                    memory.registertohikes.lastageupdate = nowdate;
                    memory.registertohikes.age += 1;
                }
            }
            
            registerparams["VAR_NEW_HIKES_LIST"] = thishikeobject.hikes;
            memory.registertohikes.selectedhikes = memory.selectedhikes;
            var link = memory.hikeseditforms[hikecanceldate].link;
            switch (memory.operation) {
                case "edithike":
                    for (let index = 0; index < memory.selectedhikes.length; index++) {
                        const hike = memory.selectedhikes[index];
                        var hikedate = hike.match(/\d{1,2}\.\d{1,2}\.\d{2}/g)[0];
                        hikedate = hikedate.replace(/\./g,"_");
                        if (memory.hikeseditforms[hikedate].link == link) {
                            memory.hikeseditforms[hikedate] = {
                                "car/ride": memory.registertohikes["car/ride"],
                                "plays on": memory.registertohikes["plays on"],
                                "comes from": memory.registertohikes["comes from"],
                                "returns to": memory.registertohikes["returns to"],
                                "can organize": memory.registertohikes["can organize"],
                                "saved the date": memory.registertohikes["saved the date"],
                                "friends joining": memory.registertohikes["friends joining"],
                                "available places": memory.registertohikes["available places"],
                                friendsdetails: memory.friendsdetails,
                                link: link,
                                hikes: registerparams["VAR_NEW_HIKES_LIST"],
                            };
                        }
                    }
                    break;
                case "cancel":
                    delete memory.registertohikes.hikeseditforms[hikecanceldate];
                    delete memory.hikeseditforms[hikecanceldate];
                    registerparams["VAR_NEW_HIKES_LIST"].splice(registerparams["VAR_NEW_HIKES_LIST"].indexOf(selectHike),1);
                    memory.selectedhikes.splice(memory.selectedhikes.indexOf(selectHike),1);
                    for (let index = 0; index < memory.selectedhikes.length; index++) {
                        const hike = memory.selectedhikes[index];
                        var hikedate = hike.match(/\d{1,2}\.\d{1,2}\.\d{2}/g)[0];
                        hikedate = hikedate.replace(/\./g,"_");
                        if (memory.hikeseditforms[hikedate].link == link) {
                            memory.hikeseditforms[hikedate] = {
                                "car/ride": memory.registertohikes["car/ride"],
                                "plays on": memory.registertohikes["plays on"],
                                "comes from": memory.registertohikes["comes from"],
                                "returns to": memory.registertohikes["returns to"],
                                "can organize": memory.registertohikes["can organize"],
                                "saved the date": memory.registertohikes["saved the date"],
                                "friends joining": memory.registertohikes["friends joining"],
                                "available places": memory.registertohikes["available places"],
                                friendsdetails: memory.friendsdetails,
                                link: link,
                                hikes: registerparams["VAR_NEW_HIKES_LIST"],
                            };
                        }
                    }
                    if (registerparams["VAR_NEW_HIKES_LIST"].length == 0) {
                        registerparams["VAR_SAVED_THE_DATE"] = "תכננתי לבוא ואני נאלץ לבטל הגעה";
                    }
                    break;
                default:
                    break;
            }

            memory.registertohikes.friendsdetails = memory.friendsdetails;
            memory.registertohikes.hikeseditforms = memory.hikeseditforms;

            dbservices.gethikes(res)
            .then(hikedocs => {
                var hebrewhikenames = [];
                for (let indexhike = 0; indexhike < registerparams["VAR_NEW_HIKES_LIST"].length; indexhike++) {
                    const currhike = registerparams["VAR_NEW_HIKES_LIST"][indexhike];
                    findhike = tools.findhike(hikedocs, currhike);
                    if (findhike != null) {
                        hebrewhikenames.push(findhike.hikenamehebrew);
                    }
                }
                registerparams["VAR_NEW_HIKES_LIST"] = hebrewhikenames;

                var translations = [
                    {
                        paramname: "VAR_SAVED_THE_DATE",
                        values: [
                            {english: "Yes", hebrew: "כן"},
                            {english: "I could maybe join the hike", hebrew: "אולי אוכל לבוא לטיול, לא בטוח שאני פנוי"},
                            {english: "I save the date but I do have concerns", 
                                hebrew: "אני שומר את התאריך הזה פנוי, אבל יש לי חששות לבוא לטיול"},
                        ]
                    },
                    {
                        paramname: "VAR_HAVE_A_CAR",
                        values: [
                            {english: "I come in my car", hebrew: "אני מגיע ברכב"},
                            {english: "I need a ride", hebrew: "אני צריך טרמפ"},
                            {english: "I need a ride but I do have a car", hebrew: "אני צריך טרמפ (אבל יש לי רכב)"},
                            {english: "I already setuped with a friend I'm joining (I will write who it is in the form)", 
                                hebrew: "קבעתי כבר עם חבר אחר שאני מצטרף אליו (אפרט בהמשך הטופס מי זה)"},
                            {english: "I come in bus, a motorcycle or other", hebrew: "אני מגיע באוטובוס או אופנוע, אחר"},
                            {english: "I will rent a car if there will be hitchhikers", hebrew: "אשכור רכב אם יהיו טרמפיסטים"},
                        ]
                    }
                ];

                for (let indextranslate = 0; indextranslate < translations.length; indextranslate++) {
                    const translate = translations[indextranslate];
                    for (let indexval = 0; indexval < translate.values.length; indexval++) {
                        const val = translate.values[indexval];
                        if (registerparams[translate.paramname] == val.english) {
                            registerparams[translate.paramname] = val.hebrew;
                        }
                    }
                }

                console.log("registerparams " + JSON.stringify(registerparams));
                console.log("memory.registertohikes " + JSON.stringify(memory.registertohikes));
        
                register.edithikes(language, res, registerparams, memory);
            })
            .catch(rejection => {
                logservices.logRejection(rejection);
            });
        }
        else {
            var conversation_reply = 
                replies.get_reply("ROBOT_CONFUSED_EDITHIKE_NOT_SELECTED_HIKE",language,null,memory);
            res.status(200).json(conversation_reply);
        }
    }
  });

/*  "/api/joinupdates"
*    POST: send email to tiulimg@gmail.com about newly signed address to add to mailing list
*    PATCH: send email to tiulimg@gmail.com about newly signed address to add to mailing list from short form
*/

app.post("/api/joinupdates", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, req.query.pwd)) {
        var conversation_reply;
        var language = tools.set_language(memory);

        if (memory.phonenumber2.indexOf("+972") != -1) {
            memory.phonenumber2 = memory.phonenumber2.replace("+972","0");
        }
        memory.phonenumber = memory.phonenumber2;

        mail.joinEmailUpdates(
            memory.myname, memory.email, memory.phonenumber, memory.isgay2, memory.howdidihear2, language);

        conversation_reply = replies.get_reply("JOINUPDATES_SUCCESS",language,null,memory);
        res.status(200).json(conversation_reply);
    }
  });

  app.patch("/api/joinupdates", function(req, res) {
    var body = req.body;
    if (tools.checkpwd(res, body.pwd)) {
        mail.joinEmailAndWhatsAppUpdates(
            body.myname, body.email, body.phonenumber, body.which_to_join);

        res.status(200).json("SUCCESS");
    }
  });

/*  "/api/selecthikes"
*    PATCH: responds with quick replies of all available hikes
*    POST: responds with quick replies of all available hikes but the hikes user already selected
*/

app.patch("/api/selecthikes", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, memory.pwd)) {
        dbservices.gethikes(res)
        .then(docs => {
            var language = tools.set_language(memory);
            docs = tools.remove_past_hikes(docs);
            docs = tools.sort_hikes(docs);
            var conversation_reply = replies.get_reply("NO_ANSWER",language,null,null);    
            conversation_reply = register.setAvailableHikesReply(conversation_reply, docs, language, null);
            res.status(200).json(conversation_reply);
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

app.post("/api/selecthikes", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, memory.pwd)) {
        dbservices.gethikes(res)
        .then(docs => {
            var language = tools.set_language(memory);
            docs = tools.remove_past_hikes(docs);
            docs = tools.sort_hikes(docs);
            var selectedHikes = [];
            console.log("memory.selectedhikes " + JSON.stringify(memory.selectedhikes));
            if (typeof memory.selectedhikes !== 'undefined' && memory.selectedhikes != null &&
                memory.selectedhikes != "") {
                selectedHikes = memory.selectedhikes;
                console.log("selectedHikes b4 " + JSON.stringify(selectedHikes));
                selectedHikes = tools.remove_past_hikes(selectedHikes);
                console.log("selectedHikes removepasthikes " + JSON.stringify(selectedHikes));
                selectedHikes = tools.remove_hikes_notinlist(selectedHikes, docs);
                console.log("selectedHikes removehikesnotinlist " + JSON.stringify(selectedHikes));
                selectedHikes = tools.sort_hikes(selectedHikes);
                console.log("selectedHikes sort_hikes " + JSON.stringify(selectedHikes));
                selectedHikes = tools.only_hikes_in_lang(docs, selectedHikes, language);
                console.log("selectedHikes only_hikes_in_lang " + JSON.stringify(selectedHikes));

                memory.selectedhikes = selectedHikes;
            }
            var selectHike = "";
            var dateformats = ["DD.MM.YY", "DD.MM.YYYY", "DD-MM-YYYY","DD-MM-YY","DD/MM/YYYY","DD/MM/YY",
                "DD.MM","DD/MM","DD-MM", "DD MM YYYY", "DD MM YY", "DD MM", "DD\\MM\\YYYY", "DD\\MM\\YY", "DD\\MM"];
            var lasthike = null;
            if (docs.length > 0) {
                lasthike = tools.datestringtoobject(docs[docs.length - 1].hikedate);
            }
            var isbeyondlasthike = false;
            if (memory.selecthike && memory.selecthike2) {
                var memorySelectHike = memory.selecthike.raw;
                var hikedate = memory.selecthike2.replace(/[a-zA-Zא-ת \(\)  '`\"״שׁשׂ+אַאָאּבּגּדּהּוּזּטּיּךּכּלּמּנּסּףּפּצּקּרּשּתּוֹ]/g, "").trim();
                var hikedate2 = hikedate.match(/\d{1,2}\.\d{1,2}\.\d{2}/g);
                console.log("selecthike2 replace " + hikedate);
                console.log("hikedate2 " + hikedate2);
                for (let index = 0; index < dateformats.length; index++) {
                    const format = dateformats[index];
                    var hikedate = moment(hikedate, format);
                    if (typeof hikedate !== 'undefined' && hikedate != null) {
                        hikedate = hikedate.toDate();
                        console.log("date moment " + JSON.stringify(hikedate) + " " + hikedate);
                        memorySelectHike = 
                            hikedate.getDate() + "." + (hikedate.getMonth()+1) + "." + hikedate.getFullYear().toString().substr(-2);
                        console.log("memorySelectHike moment " + memorySelectHike);

                        if (hikedate > lasthike) {
                            isbeyondlasthike = true;
                        }
                        break;
                    }
                }
                console.log("last memorySelectHike " + memorySelectHike);
                if (hikedate2) {
                    selectHike = tools.findhike(docs, memorySelectHike, hikedate2[0]);
                }
                else {
                    selectHike = tools.findhike(docs, memorySelectHike);
                }
                console.log("selectHike " + JSON.stringify(selectHike));

                if (selectHike && selectHike != "") {
                    switch (language) {
                        case "he":
                            var indexhe = selectedHikes.indexOf(selectHike.hikenamehebrew);
                            var indexen = selectedHikes.indexOf(selectHike.hikenameenglish);
                            var index = indexhe == -1 ? indexen : indexhe;
                            if (indexhe == -1 && indexen == -1) {
                                selectedHikes.push(selectHike.hikenamehebrew);
                            }
                            else {
                                selectedHikes.splice(index, 1);
                            }
                            break;
                        case "en":
                            var indexhe = selectedHikes.indexOf(selectHike.hikenamehebrew);
                            var indexen = selectedHikes.indexOf(selectHike.hikenameenglish);
                            var index = indexhe == -1 ? indexen : indexhe;
                            if (indexhe == -1 && indexen == -1) {
                                selectedHikes.push(selectHike.hikenameenglish);
                            }
                            else {
                                selectedHikes.splice(index, 1);
                            }
                            break;
                        default:
                            break;
                    }
                }
            }
            console.log("selectedHikes after change " + JSON.stringify(selectedHikes));
            if (selectedHikes.length == 0) {
                memory.emptyhikes = "yes";
            }
            else {
                memory.emptyhikes = selectedHikes.join("\n");
            }
            memory.selectedhikes = selectedHikes;
            var conversation_reply;
            if (isbeyondlasthike) {
                conversation_reply = replies.get_reply("RESIGTRATION_YET_OPEN",language,
                    [selectedHikes.join("\n")],memory);
            }
            else if (typeof selectHike === 'undefined' || selectHike == null || selectHike == "") {
                conversation_reply = replies.get_reply("DIDNT_RECOGNIZE_THE_REQUESTED_HIKE",language,
                    [selectedHikes.join("\n")],memory);                        
            }
            else {
                if (selectedHikes.length > 0) {
                    conversation_reply = replies.get_reply("HIKES_SELECTED",language,
                        [selectedHikes.join("\n")],memory);
                }
                else {
                    conversation_reply = replies.get_reply("NO_ANSWER",language,null,memory);
                }
            }
            conversation_reply = 
                register.setAvailableHikesReplyBut(conversation_reply, docs, language, selectedHikes);
            res.status(200).json(conversation_reply);
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});
  
/*  "/api/hike"
*    GET: gets all hike details
*    PATCH: checks if any hike plan is in place
*    PUT: updates hike list with a new list
*/

app.get("/api/hike", function(req, res) {
    if (tools.checkpwd(res, req.query.pwd)) {
        dbservices.gethikes(res)
        .then(docs => {
            res.status(200).json(docs);
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

app.patch("/api/hike", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, memory.pwd)) {
        var language = tools.set_language(memory);
        dbservices.gethikes(res)
        .then(docs => {
            docs = tools.remove_past_hikes(docs);
            docs = tools.sort_hikes(docs);
            var conversation_reply;
            if (docs.length > 0) {
                conversation_reply = replies.get_reply("NO_ANSWER",language,null,memory);    
                if (memory.phonenumber) {
                    memory.stage = "haslastregister";
                }
            }
            else {
                conversation_reply = replies.get_reply("NO_HIKES_PLANNED",language,null,memory);                        
                delete memory.stage;
            }
            res.status(200).json(conversation_reply);
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

app.put("/api/hike", function(req, res) {
    if (tools.checkpwd(res, req.body.pwd)) {
        var hikes = req.body.hikes;
        dbservices.replaceallhikes(res, hikes)
        .then(() => {
            res.status(200).json("success");
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

/*  "/api/hikers"
*    GET: gets all hikers
*    PUT: updates hiker list with a new list
*/

app.get("/api/hikers", function(req, res) {
    if (tools.checkspecialpwd(res, req.query.pwd, req.query.specialpwd)) {
        dbservices.gethikers(res, true)
        .then(docs => {
            res.status(200).json(docs);
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
  });

app.put("/api/hikers", function(req, res) {
    if (tools.checkpwd(res, req.body.pwd)) {
        var hikers = req.body.hikers;
        dbservices.replaceallhikers(res, hikers)
        .then(() => {
            res.status(200).json("success");
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

/*  "/api/choosehike/:phone"
*    PATCH: select hike for ridedetails by phone
*/

app.patch("/api/choosehike/:phone", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, memory.pwd)) {
        var language = tools.set_language(memory);
        var reply_sent = false;
        dbservices.gethikes(res)
        .then(docs => {
            docs = tools.remove_past_hikes(docs);
            var nowstring = docs[0].lastupdate;
            
            var phonenumber = req.params.phone;
            phonenumber = tools.normalize_phonenumber(phonenumber);
            memory.phonenumber = phonenumber;

            dbservices.getlastregisterbyphonenumber(res, phonenumber)
            .then(doclast => {
                if (typeof doclast !== 'undefined' && doclast != null) {
                    dbservices.gethikerswithdrivers(res)
                    .then(rides => {
                        var selectedhikes = JSON.parse(JSON.stringify(doclast.selectedhikes));
                        reply_sent = true;

                        selectedhikes = tools.remove_past_hikes(selectedhikes);
                        selectedhikes = tools.only_hikes_in_lang(docs, selectedhikes, language);
                        var selectedrides = tools.remove_hikes_notinlist(selectedhikes, rides);
                        
                        if (selectedrides.length == 1) {
                            memory.stage = "getridedetails";
                            memory.selectedhike = selectedrides[0];
                            ridesmodules.patchridedetails(req, res, replies);
                        }
                        else {
                            if (selectedrides.length > 1) {
                                memory.stage = "getridedetails_choosehike";
                                delete memory.selectedhike;
                                var conversation_reply = replies.get_reply("NO_ANSWER",language,null,memory);    
                                var title = replies.get_conversation_string("CHOOSE_HIKE_TO_EDIT", language);
                                conversation_reply = 
                                    register.setAvailableHikesReply(conversation_reply, selectedrides, language, title); 
                                res.status(200).json(conversation_reply);
                            }
                            else {
                                var conversation_reply = 
                                    replies.get_reply("RIDES_NOT_ARRANGED",language,
                                        [nowstring, selectedhikes.join("\n")],memory);  
                                res.status(200).json(conversation_reply);
                            }
                        }
                    })
                    .catch(rejection => {
                        logservices.logRejection(rejection);
                    });
                }
                else {
                    conversation_reply = replies.get_reply("REGISTERED_NO_HIKE_SUGGEST",language,null,memory);
                    res.status(200).json(conversation_reply);
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
});

/*  "/api/ridedetails/:phone"
*    PATCH: find hiker by phone
*    PUT: update hiker status by phone
*/

app.patch("/api/ridedetails/:phone", function(req, res) {
    ridesmodules.patchridedetails(req, res, replies);
});

app.put("/api/ridedetails/:phone", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, memory.pwd)) {
        dbservices.gethikes(res)
        .then(docs => {
            var nowstring = docs[0].lastupdate;
            var phonenumber = req.params.phone;
            phonenumber = tools.normalize_phonenumber(phonenumber);
            var selectedhike = memory.selectedhike;
            var hiketodate = selectedhike.match(/.*\d{1,2}\.\d{1,2}\.\d{2}/g)[0];

            dbservices.gethikerbyhikedateandphonenumber(res, hiketodate, phonenumber)
            .then(doc => {
                var conversation_reply;
                var hadsetup = memory.hadsetup;
                var language = tools.set_language(memory);

                if (typeof(doc) === 'undefined' || doc == null) {
                    conversation_reply = 
                        replies.get_reply("HIKER_NOT_REGISTERED_SPECIFIC_HIKE",language,[nowstring, selectedhike],memory);    
                        res.status(200).json(conversation_reply);
                } 
                else
                {
                    dbservices.getlastregisterbyphonenumber(res, phonenumber)
                    .then(doclast => {
                        if (typeof(doclast) !== 'undefined' && doc != doclast) {
                            if (hadsetup)
                            {
                                conversation_reply = 
                                    replies.get_reply("GREAT_FOR_UPDATE",language,null,memory); 
                                dbservices.updatehikerstatus(res, hiketodate, phonenumber, "hadsetup")
                                .catch(rejection => {
                                    logservices.logRejection(rejection);
                                });
                                register.updateCarpool(res);
                            }
                        }
                        res.status(200).json(conversation_reply);
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
});

/*  "/api/choosedriver"
*    POST: choose a driver on the way to the hike and on the way back
*/

app.post("/api/choosedriver", function(req, res) {
    var memory = req.body;
    if (tools.checkpwd(res, memory.pwd)) {
        var phonenumber = memory.phonenumber;
        phonenumber = tools.normalize_phonenumber(phonenumber);

        var selectedhike = memory.selectedhike;
        var hiketodate = selectedhike.match(/.*\d{1,2}\.\d{1,2}\.\d{2}/g)[0];

        dbservices.gethikerbyhikedateandphonenumber(res, hiketodate, phonenumber)
        .then(docme => {
            var conversation_reply;
            var language = tools.set_language(memory);

            if (typeof(docme) !== 'undefined' || docme != null) {
                dbservices.getdriversforhike(res, hiketodate, false)
                .then(drivers => {
                    console.log("memory.selecteddriverindex.raw " + memory.selecteddriverindex.raw);
                    var selecteddriverindex = parseInt(memory.selecteddriverindex.raw) - 1;
                    console.log("selecteddriverindex " + selecteddriverindex);
                    var selecteddriver = drivers[selecteddriverindex];
                    console.log("selecteddriver " + JSON.stringify(selecteddriver));
                    var direction = memory.selecteddriverdirection.raw;
                    if (direction.indexOf("הלוך") != -1 || direction.toLowerCase().indexOf("to the hike") != -1) {
                        direction = "to";
                    }
                    else if (direction.indexOf("חזור") != -1 || direction.toLowerCase().indexOf("the way back") != -1) {
                        direction = "from";
                    }
                    
                    var chosendriversto = [];
                    var chosendriversfrom = [];
                    var chosendrivers = [];
                    if (docme.chosendriversto) {
                        chosendriversto = docme.chosendriversto;
                    }
                    if (docme.chosendriversfrom) {
                        chosendriversfrom = docme.chosendriversfrom;
                    }
                    if (direction == "to") {
                        chosendrivers = chosendriversto;
                    }
                    else if (direction == "from") {
                        chosendrivers = chosendriversfrom;
                    }
                    var driverexists = chosendrivers.find(function(element) {
                        var result = false;
                        if (element.phone && element.phone == selecteddriver.phone) {
                            result = true;
                        }
                        return result;
                    });
                    console.log("driverexists " + JSON.stringify(driverexists));

                    if (driverexists == null) {
                        chosendrivers.push(selecteddriver);
                    }
                    else {
                        var index = chosendrivers.indexOf(driverexists);
                        console.log("index " + index);
                        
                        chosendrivers.splice(index, 1);
                    }
                    dbservices.updatehikerchoosedrivers(res, direction, chosendrivers)
                    .catch(rejection => {
                        logservices.logRejection(rejection);
                    });

                    var selecteddriverstostring = "";
                    var selecteddriversfromstring = "";
                    var driversstring = "";

                    switch (language) {
                        case "he":
                            for (let index = 0; index < drivers.length; index++) {
                                const driver = drivers[index];
                                driversstring += (index + 1) + ": מגיע מ" + 
                                    driver.comesfrom + " וחוזר ל" + driver.returnsto + "\n";
                            }
                            for (let index = 0; index < chosendriversto.length; index++) {
                                const chosendriver = chosendriversto[index];
                                var driverindex = -1;
                                for (let j = 0; j < drivers.length; j++) {
                                    const currdriver = drivers[j];
                                    if (currdriver.phone == chosendriver.phone) {
                                        driverindex = j;
                                        break;
                                    }
                                }
                                selecteddriverstostring += (driverindex + 1) + ": מגיע מ" + 
                                    chosendriver.comesfrom + " וחוזר ל" + chosendriver.returnsto + "\n";
                            }
                            for (let index = 0; index < chosendriversfrom.length; index++) {
                                const chosendriver = chosendriversfrom[index];
                                var driverindex = -1;
                                for (let j = 0; j < drivers.length; j++) {
                                    const currdriver = drivers[j];
                                    if (currdriver.phone == chosendriver.phone) {
                                        driverindex = j;
                                        break;
                                    }
                                }
                                selecteddriversfromstring += (driverindex + 1) + ": מגיע מ" + 
                                    chosendriver.comesfrom + " וחוזר ל" + chosendriver.returnsto + "\n";
                            }
                            break;
                        case "en":
                            for (let index = 0; index < drivers.length; index++) {
                                const driver = drivers[index];
                                driversstring += (index + 1) + ": Comes from " + 
                                    driver.comesfrom + ", returns to " + driver.returnsto + "\n";
                            }
                            for (let index = 0; index < chosendriversto.length; index++) {
                                const chosendriver = chosendriversto[index];
                                var driverindex = -1;
                                for (let j = 0; j < drivers.length; j++) {
                                    const currdriver = drivers[j];
                                    if (currdriver.phone == chosendriver.phone) {
                                        driverindex = j;
                                        break;
                                    }
                                }
                                selecteddriverstostring += (driverindex + 1) + ": Comes from " + 
                                    chosendriver.comesfrom + ", returns to " + chosendriver.returnsto + "\n";
                            }
                            for (let index = 0; index < chosendriversfrom.length; index++) {
                                const chosendriver = chosendriversfrom[index];
                                var driverindex = -1;
                                for (let j = 0; j < drivers.length; j++) {
                                    const currdriver = drivers[j];
                                    if (currdriver.phone == chosendriver.phone) {
                                        driverindex = j;
                                        break;
                                    }
                                }
                                selecteddriversfromstring += (driverindex + 1) + ": Comes from " + 
                                    chosendriver.comesfrom + ", returns to " + chosendriver.returnsto + "\n";
                            }
                            break;
                        default:
                            break;
                    }
                    conversation_reply = 
                        replies.get_reply("CHOOSE_ADRIVER",language,
                            [selecteddriverstostring,selecteddriversfromstring,driversstring],memory);
                    res.status(200).json(conversation_reply);
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
});

/*  "/api/ironnumber"
*    GET: gets all iron numbers only (raw)
*    PATCH: gets all iron numbers (reports regarding hikers that are with us in the hike)
*    POST: creates or updates iron number 
*/

app.get("/api/ironnumber", function(req, res) {
    if (tools.checkspecialpwd(res, req.query.pwd, req.query.specialpwd)) {
        dbservices.getironnumbers(res)
        .then(ironnumbers => {
            res.status(200).json(ironnumbers);
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

app.patch("/api/ironnumber", function(req, res) {
    if (tools.checkspecialpwd(res, req.query.pwd, req.query.specialpwd)) {
        var selectedhike = req.query.hikename;
        if (selectedhike) {
            var hiketodate = selectedhike.match(/\d{1,2}\.\d{1,2}\.\d{2}/)[0];
            dbservices.gethikersbyhikedate(res, hiketodate, true)
            .then(docs => {
                dbservices.getironnumbers(res)
                .then(previronnumbers => {
                    var now = new Date();
                    var ironnumbers = [];
                    for (var index = 0; index < docs.length; index++) {
                        const hiker = docs[index];
                        console.log("hiker " + JSON.stringify(hiker));
                        var lastseen = "";
                        var withus = "לא";
                        var car = "לא";
                        if (hiker.amidriver) {
                            car = "כן";
                        }
                        var previronnumber = previronnumbers.find(function(element) {
                            var result = false;
                            if (element.phone && element.phone == hiker.phone) {
                                result = true;
                            }
                            return result;
                        });
                        console.log("previronnumber " + JSON.stringify(previronnumber));
                        if (previronnumber && previronnumber.lastseen) {
                            lastseen = previronnumber.lastseen;
                            var compareLastSeen = new Date(lastseen.getTime() + 30*60000);
                            if (compareLastSeen > now) {
                                withus = "כן";
                            }
                            lastseen = lastseen.toLocaleTimeString("he-IL", {timeZone: "Asia/Jerusalem"});
                        }
                        ironnumbers.push({
                            name: hiker.fullname,
                            phone: hiker.phone,
                            withus: withus,
                            lastseen: lastseen,
                            car: car,
                        });
                    }
                    res.status(200).json(ironnumbers);
                })
                .catch(rejection => {
                    logservices.logRejection(rejection);
                });
            })
            .catch(rejection => {
                logservices.logRejection(rejection);
            });
        }
        else {
            res.status(200).json([]);
        }
    }
});

app.post("/api/ironnumber", function(req, res) {
    if (tools.checkpwd(res, req.body.pwd)) {
        var phonenumber = req.body.phone;
        if (phonenumber == process.env.SPECIALPWD) {
            phonenumber = process.env.TAL_PHONE;
        }
        if (phonenumber) {
            var isPhoneNumber = phonenumber.match(/^\d{10}$/);
            
            if (isPhoneNumber) {
                var selectedhike = req.body.hikename;
                //var hiketodate = selectedhike.match(/\d{1,2}\.\d{1,2}\.\d{2}/)[0];
                phonenumber = tools.normalize_phonenumber(phonenumber);
                dbservices.updateironnumberbyphone(res, phonenumber, selectedhike)
                .then(() => {
                    res.status(200).json("success");
                })
                .catch(rejection => {
                    logservices.logRejection(rejection);
                });
            }
            else {
                res.status(400).json("Phone number is not 10 digits formatted");
            }
        }
        else {
            res.status(400).json("Phone number is missing");
        }
    }
});

/*  "/api/findhikerslocation"
*    PATCH: queries for lat lon locations for hikers comesfromdetailed and returnstodetailed
*/
app.patch("/api/findhikerslocation", function(req, res) {
    if (tools.checkspecialpwd(res, req.query.pwd, req.query.specialpwd)) {
        dbservices.gethikers(res, true)
        .then(hikers => {
            ridesmodules.findhikerslocation(hikers)
            .then(hikers => {
                dbservices.replaceallhikers(res, hikers)
                .then(() => {
                    register.updateCarpool(res);
                })
                .catch(rejection => {
                    logservices.logRejection(rejection);
                });
            });
            res.status(200).json("Working...");
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

  
/*  "/api/calculaterides"
*    PATCH: starts the ride calculation process
*/

app.patch("/api/calculaterides", function(req, res) {
    var lock = {
        stillrunning: true,
        starttime: new Date(),
    };
    if (tools.checkspecialpwd(res, req.query.pwd, req.query.specialpwd)) {
        dbservices.gethikes(res)
        .then(hikes => {
            var nearhikes = tools.get_near_hikes(hikes);
            if (nearhikes.length > 0) {
                ridesmodules.setcarpool(res, nearhikes)
                .then(() => {
                    register.updateCarpool(res);
                    lock.stillrunning = false;
                })
                .catch(rejection => {
                    logservices.logRejection(rejection);
                    lock.stillrunning = false;
                });
            }
            res.status(200).json("Working...");
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

/*  "/api/routes"
*    DELETE: deletes all routes
*/

app.delete("/api/routes", function(req, res) {
    if (tools.checkspecialpwd(res, req.query.pwd, req.query.specialpwd)) {
        dbservices.deleteallroutes(res)
        .then(() => {
            res.status(200).json("success");
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    }
});

/*  "/api/testsendmessage"
*    PATCH: test a whatsapp message
*/

app.patch("/api/testsendmessage", function(req, res) {
    if (tools.checkspecialpwd(res, req.query.pwd, req.query.specialpwd)) {
        sapchatbot.saveconversationidtoall(res)
        //messageconnector.sendToCallmebotWhatsapp(res, process.env.TAL_PHONE,"מה קורה? נרשמת לסדנת הומור היום, אתה בא?")
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
        res.status(200).json("success");
    }
});

/*  "/api/verifyplanstocome"
*    PATCH: send all registered hikers for a hike a message to ask if they plan to come as they've registered
*/

app.patch("/api/verifyplanstocome", function(req, res) {
    if (tools.checkspecialpwd(res, req.query.pwd, req.query.specialpwd)) {
        dbservices.gethikes(res)
        .then(hikes => {
            var nearhikes = tools.get_near_hikes(hikes);
            if (nearhikes.length > 0) {
                sapchatbot.verifyplanstocome(res, nearhikes)
                .then(() => {
                    res.status(200).json("success");
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
});

/*  "/api/allhistory"
*    PATCH: update the history length, and start save all history from that point, if not end of file
*/

app.patch("/api/allhistory", function(req, res) {
    if (tools.checkspecialpwd(res, req.query.pwd, req.query.specialpwd)) {
        if (req.body && req.body.historylength >= 0 && req.body.currentlength >= 0 && req.body.nextstart >= 0) {
            dbservices.savehistorylength(res, req.body.historylength, req.body.currentlength, req.body.nextstart)
            .then(() => {
                nextstart = parseInt(req.body.nextstart);
                historylength = parseInt(req.body.historylength);
                diff = historylength - nextstart;
                var end;
                if (diff > 250) {
                    end = nextstart + 250;
                }
                else if (diff == 0) {
                    end = nextstart;
                }
                else {
                    end = nextstart + diff;
                }
                register.updateHistoryData(res, nextstart, end);
                res.status(200).json("proccesed history");
            })
            .catch(rejection => {
                logservices.logRejection(rejection);
            });        
        }
        else {
            dbservices.deletehistorylength(res)
            .then(() => {
                res.status(200).json("deleted history length");
            })
        }
    }
});

/*  "/api/afterhikematch"
*    POST: save new afterhike match and test a match
*    PUT: delete old afterhike matches, and save latest hikers
*/

app.post("/api/afterhikematch", function(req, res) {
    if (tools.checkpwd(res, req.query.pwd)) {
        afterhikeform = req.body;
        myphonenumber = afterhikeform["מה מספר הטלפון שלי?"]
        dbservices.getprevhikerbyphonenumber(res, myphonenumber)
        .then(mehikerinhikes => {
            if (mehikerinhikes.length > 0) {
                console.log(`phone ${myphonenumber} ${JSON.stringify(mehikerinhikes)}`)
                mearrivedwith = []
                for (let index = 0; index < mehikerinhikes.length; index++) {
                    const meinhike = mehikerinhikes[index];
                    var hike_date = meinhike.hikenamehebrew;
                    hike_date = hike_date.match(/[0-9\-]{1,2}\.[0-9]{1,2}\.[0-9]{1,2}/g)[0];
                    hiker_name = `${meinhike["name"]}, הגעתי מ${meinhike["comesfrom"]} `;
                    if (meinhike["mydriverto"]) {
                        hiker_name += `עם ${meinhike["mydriverto"]["name"]}`;
                    }
                    else if (meinhike["availableplaces"]) {
                        hiker_name += "ברכב ";
                    }
                    hiker_name += "בתאריך " + hike_date;
                    mearrivedwith.push(hiker_name)
                }
                afterhikeform = {
                    "phone": myphonenumber,
                    "whoami": mearrivedwith,
                    "mymatches": JSON.parse(afterhikeform["מי מצא חן בעיניי?"]),
                };
                console.log(`afterhikeform ${JSON.stringify(afterhikeform)}`)
    
                dbservices.updateafterhikematch(res, afterhikeform)
                .then(() => {
                    dbservices.findafterhikematch(res, afterhikeform)
                    .then(matches => {
                        console.log(`matches: ${JSON.stringify(matches)}`)
                        if (matches.length > 0) {
                            dbservices.getprevhikers(res)
                            .then(hikers => {
                                hiker_matches = [];
                                mehiker = null;
                                for (let index = 0; index < hikers.length; index++) {
                                    const hiker = hikers[index];
                                    hiker_name = `${hiker["name"]}, הגעתי מ${hiker["comesfrom"]} `;
                                    if (hiker["mydriverto"]) {
                                        hiker_name += `עם ${hiker["mydriverto"]["name"]} `;
                                    }
                                    else if (hiker["availableplaces"]) {
                                        hiker_name += "ברכב ";
                                    }
                                    hiker_name += "בתאריך " + hike_date;
                                    curr_match = matches.filter(match => {
                                        return (match["phone"] == hiker['phone'] && 
                                        match["mymatches"].filter(mymatch => {
                                            return afterhikeform['whoami'].indexOf(mymatch) != -1
                                        }).length > 0) 
                                    })
        
                                    if (curr_match.length > 0) {
                                        hiker_matches.push(hiker);
                                    }
                                    if (hiker['phone'] == afterhikeform["phone"]) {
                                        mehiker = hiker;
                                    }
                                }
    
                                sent = []
            
                                if (mehiker) {
                                    for (let index = 0; index < hiker_matches.length; index++) {
                                        const hiker_match = hiker_matches[index];
    
                                        if (sent.indexOf(hiker_match["phone"]) == -1) {
                                            mail.emailAfterHikeMatch(
                                                mehiker["email"], hiker_match["email"], mehiker["name"], hiker_match["name"], 
                                                mehiker["phone"], hiker_match["phone"]);
                                            sent.push(hiker_match["phone"])
                                        }
                                    }                            
                                }
                                res.status(200).json("end matches");
                            })
                            .catch(rejection => {
                                logservices.logRejection(rejection);
                            });                            
                        }
                        else {
                            res.status(200).json("no matches");
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
            else {
                res.status(200).json("didn't find you in last hike");
            }
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        }); 
    }
});

app.put("/api/afterhikematch", function(req, res) {
    if (tools.checkpwd(res, req.query.pwd)) {
        dbservices.deleteallafterhikematch(res)
        .then(() => {
            dbservices.replaceallprevhikers(res)
            .then(() => {
                res.status(200).json("deleted after hike forms");
            })
            .catch(rejection => {
                logservices.logRejection(rejection);
            });     
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        }); 
    }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile('/app/build/index.html');
});