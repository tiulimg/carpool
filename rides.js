var Promise = require('promise');
var request = require('request');

module.exports = {
    patchridedetails: patchridedetails,
    patchridedetailsv2: patchridedetailsv2,
    translateaddresstolocation: translateaddresstolocation,
    calculateroute: calculateroute,
};

const LOCATIONIQ_TOKEN = process.env.LOCATIONIQ_TOKEN;
const ALGOLIA_KEY = process.env.ALGOLIA_KEY;
const ALGOLIA_APPID = process.env.ALGOLIA_APPID;

function patchridedetails(req, res, db, HIKE_COLLECTION, HIKERS_COLLECTION, LAST_REGISTER_COLLECTION, replies, register, handleError)
{
    var memory = req.body.conversation.memory;
    if (!memory.pwd) {
        handleError(res, "Unauthorized", "Password is required.", 400);
    }
    else if (memory.pwd != process.env.PSWD) {
        handleError(res, "Unauthorized", "Password is incorrect.", 400);
    }
    else
    {
        var language = "he";
        if (memory.lang)
        {
            language = memory.lang;
        }
        db.collection(HIKE_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                handleError(res, err.message, "Failed to get last update string.");
            } else {
                var nowstring = docs[0].lastupdate;
                var phonenumber = req.params.phone;
                if (phonenumber.indexOf("@") == -1) {
                    phonenumber = phonenumber.replace("-","");
                }
                var selectedhike = memory.selectedhike;
                var hiketodate = selectedhike.match(/\d{1,2}\.\d{1,2}\.\d{2}/g)[0];
                console.log("hiketodate " + hiketodate);

                db.collection(HIKERS_COLLECTION).findOne(
                    { $and: [ { $or: [ { hikenamehebrew: { $regex : ".*"+hiketodate+".*" } }, 
                                       { hikenameenglish: { $regex : ".*"+hiketodate+".*" } } ] }, 
                        { $or: [ { phone: phonenumber }, { email: phonenumber.toLowerCase() } ] } ] }, function(err, doc) {
                    var recast_conversation_reply;
                    var hadexchangednumbers = false;
                    
                    if (err) {
                        console.log("An error occured: " + err);
                    }
                    else if (typeof(doc) === 'undefined' || doc == null) {
                        recast_conversation_reply = 
                            replies.get_recast_reply("HIKER_NOT_REGISTERED_SPECIFIC_HIKE",language,[nowstring, selectedhike],memory);    
                        res.status(200).json(recast_conversation_reply);
                    } 
                    else
                    {
                        db.collection(LAST_REGISTER_COLLECTION).findOne(
                            { $or: [ { "phone number": phonenumber }, { email: phonenumber.toLowerCase() } ]}, function(err, doclast) {
                                if (err) {
                                    console.log("An error occured: " + err);
                                }
                                else {
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
                                                if ((doc.myhitchersto == null || doc.myhitchersto.length == 0) &&
                                                    (doc.myhitchersfrom == null || doc.myhitchersfrom.length == 0))
                                                {
                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply("NO_HITCHHIKERS",language,[nowstring],memory); 
                                                }
                                                else if (JSON.stringify(doc.myhitchersto) == JSON.stringify(doc.myhitchersfrom))
                                                {
                                                    var hitchers = "";
                                                    switch (language) {
                                                        case "he":
                                                            for (var i=0;i<doc.myhitchersto.length;i++)
                                                            {
                                                                hitchers += doc.myhitchersto[i].hitchername + " " + doc.myhitchersto[i].hitcherphone + 
                                                                    " (מגיע מ" + doc.myhitchersto[i].hitcherwherefrom + 
                                                                    " וחוזר ל" + doc.myhitchersto[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        case "en":
                                                            for (var i=0;i<doc.myhitchersto.length;i++)
                                                            {
                                                                hitchers += doc.myhitchersto[i].hitchername + " " + doc.myhitchersto[i].hitcherphone + 
                                                                    " (Comes from " + doc.myhitchersto[i].hitcherwherefrom + 
                                                                    " and retuns to " + doc.myhitchersto[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    }

                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply("HITCHHIKERS_BACK_FORTH",language,[hitchers],memory); 
                                                }
                                                else if (doc.myhitchersto != null && doc.myhitchersfrom != null)
                                                {
                                                    var hitchersfrom = "";
                                                    var hitchersto = "";
                                                    switch (language) {
                                                        case "he":
                                                            for (var i=0;i<doc.myhitchersto.length;i++)
                                                            {
                                                                hitchersto += doc.myhitchersto[i].hitchername + " " + doc.myhitchersto[i].hitcherphone + 
                                                                    " (מגיע מ" + doc.myhitchersto[i].hitcherwherefrom + 
                                                                    " וחוזר ל" + doc.myhitchersto[i].hitcherwhereto + ")\n";
                                                            }
                                                            for (var i=0;i<doc.myhitchersfrom.length;i++)
                                                            {
                                                                hitchersfrom += doc.myhitchersfrom[i].hitchername + " " + doc.myhitchersfrom[i].hitcherphone + 
                                                                    " (מגיע מ" + doc.myhitchersfrom[i].hitcherwherefrom + 
                                                                    " וחוזר ל" + doc.myhitchersfrom[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        case "en":
                                                            for (var i=0;i<doc.myhitchersto.length;i++)
                                                            {
                                                                hitchersto += doc.myhitchersto[i].hitchername + " " + doc.myhitchersto[i].hitcherphone + 
                                                                    " (Comes from " + doc.myhitchersto[i].hitcherwherefrom + 
                                                                    " and returns to " + doc.myhitchersto[i].hitcherwhereto + ")\n";
                                                            }
                                                            for (var i=0;i<doc.myhitchersfrom.length;i++)
                                                            {
                                                                hitchersfrom += doc.myhitchersfrom[i].hitchername + " " + doc.myhitchersfrom[i].hitcherphone + 
                                                                    " (Comes from " + doc.myhitchersfrom[i].hitcherwherefrom + 
                                                                    " and returns to " + doc.myhitchersfrom[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply(
                                                            "HITCHHIKERS_DIFFERENT_BACK_FORTH",language,[hitchersto, hitchersfrom],memory); 
                                                }
                                                else if (doc.myhitchersto != null)
                                                {
                                                    var hitchers = "";
                                                    switch (language) {
                                                        case "he":
                                                            for (var i=0;i<doc.myhitchersto.length;i++)
                                                            {
                                                                hitchers += doc.myhitchersto[i].hitchername + " " + doc.myhitchersto[i].hitcherphone + 
                                                                    " (מגיע מ" + doc.myhitchersto[i].hitcherwherefrom + 
                                                                    " וחוזר ל" + doc.myhitchersto[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        case "en":
                                                            for (var i=0;i<doc.myhitchersto.length;i++)
                                                            {
                                                                hitchers += doc.myhitchersto[i].hitchername + " " + doc.myhitchersto[i].hitcherphone + 
                                                                    " (Comes from " + doc.myhitchersto[i].hitcherwherefrom + 
                                                                    " and returns to " + doc.myhitchersto[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    } 
                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply("HITCHHIKERS_FORTH",language,[hitchers],memory);
                                                }
                                                else
                                                {
                                                    var hitchersfrom = "";
                                                    switch (language) {
                                                        case "he":
                                                            for (var i=0;i<doc.myhitchersfrom.length;i++)
                                                            {
                                                                hitchersfrom += doc.myhitchersfrom[i].hitchername + " " + doc.myhitchersfrom[i].hitcherphone + 
                                                                    " (מגיע מ" + doc.myhitchersfrom[i].hitcherwherefrom + 
                                                                    " וחוזר ל" + doc.myhitchersfrom[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        case "en":
                                                            for (var i=0;i<doc.myhitchersfrom.length;i++)
                                                            {
                                                                hitchersfrom += doc.myhitchersfrom[i].hitchername + " " + doc.myhitchersfrom[i].hitcherphone + 
                                                                    " (comes from " + doc.myhitchersfrom[i].hitcherwherefrom + 
                                                                    " and returns to " + doc.myhitchersfrom[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply("HITCHHIKERS_BACK",language,[hitchersfrom],memory);
                                                }
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
                                                        doc.mydriverto.driverwherefrom,
                                                        doc.mydriverto.driverwhereto],memory);
                                                    hadexchangednumbers = true; 
                                                }
                                                else if (doc.mydriverto != null && doc.mydriverfrom != null)
                                                {
                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply("RIDE_DIFFERENT_BACK_FORTH",language,
                                                        [doc.mydriverto.name,
                                                        doc.mydriverto.phone,
                                                        doc.mydriverto.driverwherefrom,
                                                        doc.mydriverto.driverwhereto,
                                                        doc.mydriverfrom.name,
                                                        doc.mydriverfrom.phone,
                                                        doc.mydriverfrom.driverwherefrom,
                                                        doc.mydriverfrom.driverwhereto,
                                                        doc.mydriverto.name],memory);
                                                    hadexchangednumbers = true;
                                                }
                                                else if (doc.mydriverto != null)
                                                {
                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply("RIDE_FORTH",language,
                                                        [doc.mydriverto.name,
                                                        doc.mydriverto.phone,
                                                        doc.mydriverto.driverwherefrom,
                                                        doc.mydriverto.driverwhereto],memory);
                                                    hadexchangednumbers = true;
                                                }
                                                else
                                                {
                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply("RIDE_BACK",language,
                                                        [doc.mydriverfrom.name,
                                                        doc.mydriverfrom.phone,
                                                        doc.mydriverfrom.driverwherefrom,
                                                        doc.mydriverfrom.driverwhereto],memory);
                                                    hadexchangednumbers = true;
                                                }
                                                if (JSON.stringify(doc.myfriendsdriversto) == JSON.stringify(doc.myfriendsdriversfrom)) {
                                                    var text;
                                                    switch (language) {
                                                        case "he":
                                                            for (let i = 0; i < doc.myfriendsdriversto.length; i++) {
                                                                const currdriver = doc.myfriendsdriversto[i];
                                                                text = currdriver.hitchername + " יכול לבוא ולחזור עם " + 
                                                                    currdriver.drivername + " " + currdriver.driverphone + ". הוא מגיע מ" +
                                                                    currdriver.driverwherefrom + " וחוזר ל" + currdriver.driverwhereto;
                                                                recast_conversation_reply = 
                                                                    replies.push_to_recast_reply(recast_conversation_reply,text);  
                                                            }    
                                                            break;
                                                        case "en":
                                                            for (let i = 0; i < doc.myfriendsdriversto.length; i++) {
                                                                const currdriver = doc.myfriendsdriversto[i];
                                                                text = currdriver.hitchername + " can come and return with " + 
                                                                    currdriver.drivername + " " + currdriver.driverphone + ". He comes from " +
                                                                    currdriver.driverwherefrom + " and returns to " + currdriver.driverwhereto;
                                                                recast_conversation_reply = 
                                                                    replies.push_to_recast_reply(recast_conversation_reply,text);  
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                }
                                                else if (doc.myfriendsdriversto != null && doc.myfriendsdriversfrom != null) {
                                                    var text;
                                                    switch (language) {
                                                        case "he":
                                                            for (let i = 0; i < doc.myfriendsdriversto.length || i < doc.myfriendsdriversfrom.length; i++) {
                                                                const currdriverto = doc.myfriendsdriversto[i];
                                                                const currdriverfrom = doc.myfriendsdriversfrom[i];
                                                                text = currdriverto.hitchername + " יכול לבוא עם " + 
                                                                    currdriverto.drivername + " " + currdriverto.driverphone + ". הוא מגיע מ" +
                                                                    currdriverto.driverwherefrom + " וחוזר ל" + currdriverto.driverwhereto + ".\n" +
                                                                    "ולחזור עם " + currdriverfrom.drivername + " " + currdriverfrom.driverphone + 
                                                                    ". הוא מגיע מ" + currdriverfrom.driverwherefrom + " וחוזר ל" + 
                                                                    currdriverfrom.driverwhereto;
                                                                recast_conversation_reply = 
                                                                    replies.push_to_recast_reply(recast_conversation_reply,text); 
                                                            }
                                                            break;
                                                        case "en":
                                                            for (let i = 0; i < doc.myfriendsdriversto.length || i < doc.myfriendsdriversfrom.length; i++) {
                                                                const currdriverto = doc.myfriendsdriversto[i];
                                                                const currdriverfrom = doc.myfriendsdriversfrom[i];
                                                                text = currdriverto.hitchername + " can come with " + 
                                                                    currdriverto.drivername + " " + currdriverto.driverphone + ". He comes from " +
                                                                    currdriverto.driverwherefrom + " and returns to " + currdriverto.driverwhereto + ".\n" +
                                                                    "And return with " + currdriverfrom.drivername + " " + currdriverfrom.driverphone + 
                                                                    ". He comes from " + currdriverfrom.driverwherefrom + " and returns to " + 
                                                                    currdriverfrom.driverwhereto;
                                                                recast_conversation_reply = 
                                                                    replies.push_to_recast_reply(recast_conversation_reply,text); 
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                }
                                                else if (doc.myfriendsdriversto != null) {
                                                    var text;
                                                    switch (language) {
                                                        case "he":
                                                            for (let i = 0; i < doc.myfriendsdriversto.length; i++) {
                                                                const currdriver = doc.myfriendsdriversto[i];
                                                                text = currdriver.hitchername + " יכול לבוא בהלוך בלבד עם " + 
                                                                    currdriver.drivername + " " + currdriver.driverphone + ". הוא מגיע מ" +
                                                                    currdriver.driverwherefrom + " וחוזר ל" + currdriver.driverwhereto;
                                                                recast_conversation_reply = 
                                                                    replies.push_to_recast_reply(recast_conversation_reply,text);
                                                            }
                                                            break;
                                                        case "en":
                                                            for (let i = 0; i < doc.myfriendsdriversto.length; i++) {
                                                                const currdriver = doc.myfriendsdriversto[i];
                                                                text = currdriver.hitchername + " can come with " + 
                                                                    currdriver.drivername + " " + currdriver.driverphone + ". He comes from " +
                                                                    currdriver.driverwherefrom + " and returns to " + currdriver.driverwhereto;
                                                                recast_conversation_reply = 
                                                                    replies.push_to_recast_reply(recast_conversation_reply,text);
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                }
                                                else 
                                                {
                                                    var text;
                                                    switch (language) {
                                                        case "he":
                                                            for (let i = 0; i < doc.myfriendsdriversfrom.length; i++) {
                                                                const currdriver = doc.myfriendsdriversfrom[i];
                                                                text = currdriver.hitchername + " יכול לחזור בלבד עם " + 
                                                                    currdriver.drivername + " " + currdriver.driverphone + ". הוא מגיע מ" +
                                                                    currdriver.driverwherefrom + " וחוזר ל" + currdriver.driverwhereto;
                                                                recast_conversation_reply = 
                                                                    replies.push_to_recast_reply(recast_conversation_reply,text);
                                                            }    
                                                            break;
                                                        case "en":
                                                            for (let i = 0; i < doc.myfriendsdriversfrom.length; i++) {
                                                                const currdriver = doc.myfriendsdriversfrom[i];
                                                                text = currdriver.hitchername + " can return with " + 
                                                                    currdriver.drivername + " " + currdriver.driverphone + ". He comes from " +
                                                                    currdriver.driverwherefrom + " and returns to " + currdriver.driverwhereto;
                                                                recast_conversation_reply = 
                                                                    replies.push_to_recast_reply(recast_conversation_reply,text);
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                }
                                            }
                                        }
                                        if (hadexchangednumbers) {
                                            db.collection(HIKERS_COLLECTION).update(
                                                { $or: [ { phone: phonenumber }, { email: phonenumber.toLowerCase() } ] },
                                                { $set: {status: "hadexchangednumbers" }});
                                        register.sendForm("1EV8BBJfZGseTFzJo-EMcgZdPHzedRC8zTZyfyRw2LoQ", "" , "", "", res, null, null, null, "");
                                        }
                                    }
                                }
                                res.status(200).json(recast_conversation_reply);
                            });
                        }
                });
            }
        });
    }
}

function patchridedetailsv2(req, res, db, HIKE_COLLECTION, HIKERS_COLLECTION, LAST_REGISTER_COLLECTION, replies, register, handleError)
{
    var memory = req.body.conversation.memory;
    if (!memory.pwd) {
        handleError(res, "Unauthorized", "Password is required.", 400);
    }
    else if (memory.pwd != process.env.PSWD) {
        handleError(res, "Unauthorized", "Password is incorrect.", 400);
    }
    else
    {
        var language = "he";
        if (memory.lang)
        {
            language = memory.lang;
        }
        db.collection(HIKE_COLLECTION).find({}).toArray(function(err, docs) {
            if (err) {
                handleError(res, err.message, "Failed to get last update string.");
            } else {
                var nowstring = docs[0].lastupdate;
                var phonenumber = req.params.phone;
                if (phonenumber.indexOf("@") == -1) {
                    phonenumber = phonenumber.replace("-","");
                }
                var selectedhike = memory.selectedhike;
                var hiketodate = selectedhike.match(/\d{1,2}\.\d{1,2}\.\d{2}/g)[0];
                console.log("hiketodate " + hiketodate);

                db.collection(HIKERS_COLLECTION).findOne(
                    { $and: [ { $or: [ { hikenamehebrew: { $regex : ".*"+hiketodate+".*" } }, 
                                       { hikenameenglish: { $regex : ".*"+hiketodate+".*" } } ] }, 
                        { $or: [ { phone: phonenumber }, { email: phonenumber.toLowerCase() } ] } ] }, function(err, doc) {
                    var recast_conversation_reply;
                    var hadexchangednumbers = false;
                    
                    if (err) {
                        console.log("An error occured: " + err);
                    }
                    else if (typeof(doc) === 'undefined' || doc == null) {
                        recast_conversation_reply = 
                            replies.get_recast_reply("HIKER_NOT_REGISTERED_SPECIFIC_HIKE",language,[nowstring, selectedhike],memory);    
                        res.status(200).json(recast_conversation_reply);
                    } 
                    else
                    {
                        db.collection(LAST_REGISTER_COLLECTION).findOne(
                            { $or: [ { "phone number": phonenumber }, { email: phonenumber.toLowerCase() } ]}, function(err, doclast) {
                                if (err) {
                                    console.log("An error occured: " + err);
                                }
                                else {
                                    var sentrecastreply = false;
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
                                                if ((doc.myhitchersto == null || doc.myhitchersto.length == 0) &&
                                                    (doc.myhitchersfrom == null || doc.myhitchersfrom.length == 0))
                                                {
                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply("NO_HITCHHIKERS",language,[nowstring],memory); 
                                                    delete memory.stage;
                                                }
                                                else if (JSON.stringify(doc.myhitchersto) == JSON.stringify(doc.myhitchersfrom))
                                                {
                                                    var hitchers = "";
                                                    switch (language) {
                                                        case "he":
                                                            for (var i=0;i<doc.myhitchersto.length;i++)
                                                            {
                                                                hitchers += doc.myhitchersto[i].hitchername + " " + doc.myhitchersto[i].hitcherphone + 
                                                                    " (מגיע מ" + doc.myhitchersto[i].hitcherwherefrom + 
                                                                    " וחוזר ל" + doc.myhitchersto[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        case "en":
                                                            for (var i=0;i<doc.myhitchersto.length;i++)
                                                            {
                                                                hitchers += doc.myhitchersto[i].hitchername + " " + doc.myhitchersto[i].hitcherphone + 
                                                                    " (Comes from " + doc.myhitchersto[i].hitcherwherefrom + 
                                                                    " and retuns to " + doc.myhitchersto[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    }

                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply("HITCHHIKERS_BACK_FORTH",language,[hitchers],memory); 
                                                    delete memory.stage;
                                                }
                                                else if (doc.myhitchersto != null && doc.myhitchersfrom != null)
                                                {
                                                    var hitchersfrom = "";
                                                    var hitchersto = "";
                                                    switch (language) {
                                                        case "he":
                                                            for (var i=0;i<doc.myhitchersto.length;i++)
                                                            {
                                                                hitchersto += doc.myhitchersto[i].hitchername + " " + doc.myhitchersto[i].hitcherphone + 
                                                                    " (מגיע מ" + doc.myhitchersto[i].hitcherwherefrom + 
                                                                    " וחוזר ל" + doc.myhitchersto[i].hitcherwhereto + ")\n";
                                                            }
                                                            for (var i=0;i<doc.myhitchersfrom.length;i++)
                                                            {
                                                                hitchersfrom += doc.myhitchersfrom[i].hitchername + " " + doc.myhitchersfrom[i].hitcherphone + 
                                                                    " (מגיע מ" + doc.myhitchersfrom[i].hitcherwherefrom + 
                                                                    " וחוזר ל" + doc.myhitchersfrom[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        case "en":
                                                            for (var i=0;i<doc.myhitchersto.length;i++)
                                                            {
                                                                hitchersto += doc.myhitchersto[i].hitchername + " " + doc.myhitchersto[i].hitcherphone + 
                                                                    " (Comes from " + doc.myhitchersto[i].hitcherwherefrom + 
                                                                    " and returns to " + doc.myhitchersto[i].hitcherwhereto + ")\n";
                                                            }
                                                            for (var i=0;i<doc.myhitchersfrom.length;i++)
                                                            {
                                                                hitchersfrom += doc.myhitchersfrom[i].hitchername + " " + doc.myhitchersfrom[i].hitcherphone + 
                                                                    " (Comes from " + doc.myhitchersfrom[i].hitcherwherefrom + 
                                                                    " and returns to " + doc.myhitchersfrom[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply(
                                                            "HITCHHIKERS_DIFFERENT_BACK_FORTH",language,[hitchersto, hitchersfrom],memory); 
                                                    delete memory.stage;
                                                }
                                                else if (doc.myhitchersto != null)
                                                {
                                                    var hitchers = "";
                                                    switch (language) {
                                                        case "he":
                                                            for (var i=0;i<doc.myhitchersto.length;i++)
                                                            {
                                                                hitchers += doc.myhitchersto[i].hitchername + " " + doc.myhitchersto[i].hitcherphone + 
                                                                    " (מגיע מ" + doc.myhitchersto[i].hitcherwherefrom + 
                                                                    " וחוזר ל" + doc.myhitchersto[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        case "en":
                                                            for (var i=0;i<doc.myhitchersto.length;i++)
                                                            {
                                                                hitchers += doc.myhitchersto[i].hitchername + " " + doc.myhitchersto[i].hitcherphone + 
                                                                    " (Comes from " + doc.myhitchersto[i].hitcherwherefrom + 
                                                                    " and returns to " + doc.myhitchersto[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    } 
                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply("HITCHHIKERS_FORTH",language,[hitchers],memory);
                                                    delete memory.stage;
                                                }
                                                else
                                                {
                                                    var hitchersfrom = "";
                                                    switch (language) {
                                                        case "he":
                                                            for (var i=0;i<doc.myhitchersfrom.length;i++)
                                                            {
                                                                hitchersfrom += doc.myhitchersfrom[i].hitchername + " " + doc.myhitchersfrom[i].hitcherphone + 
                                                                    " (מגיע מ" + doc.myhitchersfrom[i].hitcherwherefrom + 
                                                                    " וחוזר ל" + doc.myhitchersfrom[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        case "en":
                                                            for (var i=0;i<doc.myhitchersfrom.length;i++)
                                                            {
                                                                hitchersfrom += doc.myhitchersfrom[i].hitchername + " " + doc.myhitchersfrom[i].hitcherphone + 
                                                                    " (comes from " + doc.myhitchersfrom[i].hitcherwherefrom + 
                                                                    " and returns to " + doc.myhitchersfrom[i].hitcherwhereto + ")\n";
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                    recast_conversation_reply = 
                                                        replies.get_recast_reply("HITCHHIKERS_BACK",language,[hitchersfrom],memory);
                                                    delete memory.stage;
                                                }
                                            }
                                            else
                                            {
                                                db.collection(HIKERS_COLLECTION).find({$and: [ 
                                                    { $or: [ { hikenamehebrew: { $regex : ".*"+hiketodate+".*" } }, 
                                                    { hikenameenglish: { $regex : ".*"+hiketodate+".*" } } ] }, 
                                                    {$or: [{amidriver: true} ]}] }).toArray(function(err, drivers) {
                                                    if (err) {
                                                        handleError(res, err.message, "Failed to get drivers.");
                                                    } else {
                                                        sentrecastreply = true;
                                                        var selecteddriverstostring = "";
                                                        var selecteddriversfromstring = "";
                                                        var driversstring = "";
                                                        var chosendriversto = [];
                                                        var chosendriversfrom = [];
                                                        if (doc.chosendriversto) {
                                                            chosendriversto = doc.chosendriversto;
                                                        }
                                                        if (doc.chosendriversfrom) {
                                                            chosendriversfrom = doc.chosendriversfrom;
                                                        }

                                                        switch (language) {
                                                            case "he":
                                                                for (let index = 0; index < drivers.length; index++) {
                                                                    const driver = drivers[index];
                                                                    driversstring += (index + 1) + ": מגיע מ" + 
                                                                        driver.wherefrom + " וחוזר ל" + driver.whereto + "\n";
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
                                                                        chosendriver.wherefrom + " וחוזר ל" + chosendriver.whereto + "\n";
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
                                                                        chosendriver.wherefrom + " וחוזר ל" + chosendriver.whereto + "\n";
                                                                }
                                                                break;
                                                            case "en":
                                                                for (let index = 0; index < drivers.length; index++) {
                                                                    const driver = drivers[index];
                                                                    driversstring += (index + 1) + ": Comes from " + 
                                                                        driver.wherefrom + ", returns to " + driver.whereto + "\n";
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
                                                                        chosendriver.wherefrom + ", returns to " + chosendriver.whereto + "\n";
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
                                                                        chosendriver.wherefrom + ", returns to " + chosendriver.whereto + "\n";
                                                                }
                                                                break;
                                                            default:
                                                                break;
                                                        }

                                                        memory.stage = "getridedetails_choosedriver";
                                                        if ((doc.mydriverto == null || doc.mydriverto.length == 0) &&
                                                            (doc.mydriverfrom == null || doc.mydriverfrom.length == 0))
                                                        {
                                                            recast_conversation_reply = 
                                                                replies.get_recast_reply("CHOOSE_ADRIVER",language,
                                                                    [selecteddriverstostring,selecteddriversfromstring,driversstring],
                                                                    memory);
                                                        }
                                                        else if (JSON.stringify(doc.mydriverto) == JSON.stringify(doc.mydriverfrom))
                                                        {
                                                            recast_conversation_reply = 
                                                                replies.get_recast_reply("RIDE_BACK_FORTH",language,
                                                                [doc.mydriverto.name,
                                                                doc.mydriverto.phone,
                                                                doc.mydriverto.driverwherefrom,
                                                                doc.mydriverto.driverwhereto],memory);
                                                            hadexchangednumbers = true;
                                                        }
                                                        else if (doc.mydriverto != null && doc.mydriverfrom != null)
                                                        {
                                                            recast_conversation_reply = 
                                                                replies.get_recast_reply("RIDE_DIFFERENT_BACK_FORTH",language,
                                                                [doc.mydriverto.name,
                                                                doc.mydriverto.phone,
                                                                doc.mydriverto.driverwherefrom,
                                                                doc.mydriverto.driverwhereto,
                                                                doc.mydriverfrom.name,
                                                                doc.mydriverfrom.phone,
                                                                doc.mydriverfrom.driverwherefrom,
                                                                doc.mydriverfrom.driverwhereto,
                                                                doc.mydriverto.name],memory);
                                                            hadexchangednumbers = true;
                                                        }
                                                        else if (doc.mydriverto != null)
                                                        {
                                                            recast_conversation_reply = 
                                                                replies.get_recast_reply("RIDE_FORTH",language,
                                                                [doc.mydriverto.name,
                                                                doc.mydriverto.phone,
                                                                doc.mydriverto.driverwherefrom,
                                                                doc.mydriverto.driverwhereto],memory);
                                                            hadexchangednumbers = true;
                                                        }
                                                        else
                                                        {
                                                            recast_conversation_reply = 
                                                                replies.get_recast_reply("RIDE_BACK",language,
                                                                [doc.mydriverfrom.name,
                                                                doc.mydriverfrom.phone,
                                                                doc.mydriverfrom.driverwherefrom,
                                                                doc.mydriverfrom.driverwhereto],memory);
                                                            hadexchangednumbers = true;
                                                        }
                                                        if (JSON.stringify(doc.myfriendsdriversto) == JSON.stringify(doc.myfriendsdriversfrom)) {
                                                            var text;
                                                            switch (language) {
                                                                case "he":
                                                                    for (let i = 0; i < doc.myfriendsdriversto.length; i++) {
                                                                        const currdriver = doc.myfriendsdriversto[i];
                                                                        text = currdriver.hitchername + " יכול לבוא ולחזור עם " + 
                                                                            currdriver.drivername + " " + currdriver.driverphone + ". הוא מגיע מ" +
                                                                            currdriver.driverwherefrom + " וחוזר ל" + currdriver.driverwhereto;
                                                                        recast_conversation_reply = 
                                                                            replies.push_to_recast_reply(recast_conversation_reply,text);  
                                                                    }    
                                                                    break;
                                                                case "en":
                                                                    for (let i = 0; i < doc.myfriendsdriversto.length; i++) {
                                                                        const currdriver = doc.myfriendsdriversto[i];
                                                                        text = currdriver.hitchername + " can come and return with " + 
                                                                            currdriver.drivername + " " + currdriver.driverphone + ". He comes from " +
                                                                            currdriver.driverwherefrom + " and returns to " + currdriver.driverwhereto;
                                                                        recast_conversation_reply = 
                                                                            replies.push_to_recast_reply(recast_conversation_reply,text);  
                                                                    }
                                                                    break;
                                                                default:
                                                                    break;
                                                            }
                                                        }
                                                        else if (doc.myfriendsdriversto != null && doc.myfriendsdriversfrom != null) {
                                                            var text;
                                                            switch (language) {
                                                                case "he":
                                                                    for (let i = 0; i < doc.myfriendsdriversto.length || i < doc.myfriendsdriversfrom.length; i++) {
                                                                        const currdriverto = doc.myfriendsdriversto[i];
                                                                        const currdriverfrom = doc.myfriendsdriversfrom[i];
                                                                        text = currdriverto.hitchername + " יכול לבוא עם " + 
                                                                            currdriverto.drivername + " " + currdriverto.driverphone + ". הוא מגיע מ" +
                                                                            currdriverto.driverwherefrom + " וחוזר ל" + currdriverto.driverwhereto + ".\n" +
                                                                            "ולחזור עם " + currdriverfrom.drivername + " " + currdriverfrom.driverphone + 
                                                                            ". הוא מגיע מ" + currdriverfrom.driverwherefrom + " וחוזר ל" + 
                                                                            currdriverfrom.driverwhereto;
                                                                        recast_conversation_reply = 
                                                                            replies.push_to_recast_reply(recast_conversation_reply,text); 
                                                                    }
                                                                    break;
                                                                case "en":
                                                                    for (let i = 0; i < doc.myfriendsdriversto.length || i < doc.myfriendsdriversfrom.length; i++) {
                                                                        const currdriverto = doc.myfriendsdriversto[i];
                                                                        const currdriverfrom = doc.myfriendsdriversfrom[i];
                                                                        text = currdriverto.hitchername + " can come with " + 
                                                                            currdriverto.drivername + " " + currdriverto.driverphone + ". He comes from " +
                                                                            currdriverto.driverwherefrom + " and returns to " + currdriverto.driverwhereto + ".\n" +
                                                                            "And return with " + currdriverfrom.drivername + " " + currdriverfrom.driverphone + 
                                                                            ". He comes from " + currdriverfrom.driverwherefrom + " and returns to " + 
                                                                            currdriverfrom.driverwhereto;
                                                                        recast_conversation_reply = 
                                                                            replies.push_to_recast_reply(recast_conversation_reply,text); 
                                                                    }
                                                                    break;
                                                                default:
                                                                    break;
                                                            }
                                                        }
                                                        else if (doc.myfriendsdriversto != null) {
                                                            var text;
                                                            switch (language) {
                                                                case "he":
                                                                    for (let i = 0; i < doc.myfriendsdriversto.length; i++) {
                                                                        const currdriver = doc.myfriendsdriversto[i];
                                                                        text = currdriver.hitchername + " יכול לבוא בהלוך בלבד עם " + 
                                                                            currdriver.drivername + " " + currdriver.driverphone + ". הוא מגיע מ" +
                                                                            currdriver.driverwherefrom + " וחוזר ל" + currdriver.driverwhereto;
                                                                        recast_conversation_reply = 
                                                                            replies.push_to_recast_reply(recast_conversation_reply,text);
                                                                    }
                                                                    break;
                                                                case "en":
                                                                    for (let i = 0; i < doc.myfriendsdriversto.length; i++) {
                                                                        const currdriver = doc.myfriendsdriversto[i];
                                                                        text = currdriver.hitchername + " can come with " + 
                                                                            currdriver.drivername + " " + currdriver.driverphone + ". He comes from " +
                                                                            currdriver.driverwherefrom + " and returns to " + currdriver.driverwhereto;
                                                                        recast_conversation_reply = 
                                                                            replies.push_to_recast_reply(recast_conversation_reply,text);
                                                                    }
                                                                    break;
                                                                default:
                                                                    break;
                                                            }
                                                        }
                                                        else 
                                                        {
                                                            var text;
                                                            switch (language) {
                                                                case "he":
                                                                    for (let i = 0; i < doc.myfriendsdriversfrom.length; i++) {
                                                                        const currdriver = doc.myfriendsdriversfrom[i];
                                                                        text = currdriver.hitchername + " יכול לחזור בלבד עם " + 
                                                                            currdriver.drivername + " " + currdriver.driverphone + ". הוא מגיע מ" +
                                                                            currdriver.driverwherefrom + " וחוזר ל" + currdriver.driverwhereto;
                                                                        recast_conversation_reply = 
                                                                            replies.push_to_recast_reply(recast_conversation_reply,text);
                                                                    }    
                                                                    break;
                                                                case "en":
                                                                    for (let i = 0; i < doc.myfriendsdriversfrom.length; i++) {
                                                                        const currdriver = doc.myfriendsdriversfrom[i];
                                                                        text = currdriver.hitchername + " can return with " + 
                                                                            currdriver.drivername + " " + currdriver.driverphone + ". He comes from " +
                                                                            currdriver.driverwherefrom + " and returns to " + currdriver.driverwhereto;
                                                                        recast_conversation_reply = 
                                                                            replies.push_to_recast_reply(recast_conversation_reply,text);
                                                                    }
                                                                    break;
                                                                default:
                                                                    break;
                                                            }
                                                        }
                                                    }
                                                    res.status(200).json(recast_conversation_reply);
                                                });
                                            }
                                        }
                                        if (hadexchangednumbers) {
                                            db.collection(HIKERS_COLLECTION).update(
                                                { $or: [ { phone: phonenumber }, { email: phonenumber.toLowerCase() } ] },
                                                { $set: {status: "hadexchangednumbers" }});
                                            register.sendForm("1EV8BBJfZGseTFzJo-EMcgZdPHzedRC8zTZyfyRw2LoQ", "" , "", "", res, null, null, null, "");
                                        }
                                    }
                                }
                                if (sentrecastreply) {
                                    res.status(200).json(recast_conversation_reply);
                                }
                            });
                        }
                });
            }
        });
    }
}

function translateaddresstolocation(address) {
    return new Promise((resolve, reject) => {
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
                //console.log("translateaddresstolocation algolia response " + JSON.stringify(response));
                var responsebodyjson = JSON.parse(response.body);
                //console.log("translateaddresstolocation locationiq responsebodyjson " + JSON.stringify(responsebodyjson));
                if (responsebodyjson.hits && responsebodyjson.hits[0] && responsebodyjson.hits[0]._geoloc) {
                    location = {
                        lat: responsebodyjson.hits[0]._geoloc.lat,
                        lon: responsebodyjson.hits[0]._geoloc.lng,
                    }
                    return resolve(location);
                }
                else {
                    var shortaddress;
                    var parenthesisindex = address.indexOf("(");
                    if (parenthesisindex != -1) {
                        shortaddress = address.substr(0, parenthesisindex);
                    }
                    var parenthesisindex = address.indexOf(")");
                    if (parenthesisindex != -1) {
                        shortaddress = shortaddress.substr(0, parenthesisindex);
                    }

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
                            //console.log("translateaddresstolocation locationiq response " + JSON.stringify(response));
                            var responsebodyjson = JSON.parse(response.body);
                            //console.log("translateaddresstolocation locationiq responsebodyjson " + JSON.stringify(responsebodyjson));
                            if (responsebodyjson.hits && responsebodyjson.hits[0] && responsebodyjson.hits[0]._geoloc) {
                                location = {
                                    lat: responsebodyjson.hits[0]._geoloc.lat,
                                    lon: responsebodyjson.hits[0]._geoloc.lng,
                                }
                                return resolve(location);
                            }
                            else {
                                reject("No geo location found " + address);
                            }
                        }
                    });
                }
                //console.log("translateaddresstolocation locationiq location " + JSON.stringify(location));
            }
        });
    });
}

function calculateroute(startlat,startlon,endlat,endlon,mode) { // mode = car | publicTransport
    return new Promise((resolve, reject) => {
        var url = "https://route.ls.hereapi.com/routing/7.2/calculateroute.json?apiKey="+HERE_APPID+
            "&waypoint0="+startlat+"%2C"+startlon+"&waypoint1="+endlat+"%2C"+endlon+"&mode=fastest%3B"+mode+"&combineChange=true";
        console.log("calculatecarroute here (startlat,startlon) (endlat,endlon): mode " + mode + "(" + 
            startlat+","+startlon+") ("+endlat+","+endlon + ")");
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
                //console.log("translateaddresstolocation locationiq response " + JSON.stringify(response));
                var responsebodyjson = JSON.parse(response.body);
                console.log("calculatecarroute here responsebodyjson " + JSON.stringify(responsebodyjson));
                
                //console.log("translateaddresstolocation locationiq location " + JSON.stringify(location));
                return resolve(responsebodyjson.response);
            }
        });
    });
}