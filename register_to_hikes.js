var dbservices = require("./dbservices");
var logservices = require("./logservices");
var replies = require("./replies");
var tools = require("./tools");

module.exports = {
    register_to_hikes: register_to_hikes,
    sendForm: sendForm,
    setAvailableHikesReply: setAvailableHikesReply,
    setAvailableHikesReplyBut: setAvailableHikesReplyBut,
    edithikes: edithikes,
    updateCarpool: updateCarpool,
    updateHistoryData: updateHistoryData,
};  

function register_to_hikes(language, res, params, memory)
{
    var fs = require('fs');
    fs.readFile('./resources/register_hikes_post_data.text', function (err, post_data) {
        if (err) return console.error(err);
        var form_post_data = post_data.toString();

        fs.readFile('./resources/register_hikes_draft_response.text', function (err, draft_data) {
            if (err) return console.error(err);
            var draft_response = draft_data.toString();

            form_post_data = updatePostDataParams(form_post_data, draft_response, params);

            var url = "1HxhZ75zj44Lcb-BAIXA8iW-lZQNiPra4KJuXEJ1g6pE";
            sendForm(url, form_post_data, language, "REGISTER_TO_HIKES_SUCCESS", res, memory,"");
        });    
    });
}

function edithikes(language, res, params, memory) 
{
    var fs = require('fs');
    fs.readFile('./resources/register_hikes_post_data.text', function (err, post_data) {
        if (err) return console.error(err);
        var form_post_data = post_data.toString();

        fs.readFile('./resources/register_hikes_draft_response.text', function (err, draft_data) {
            if (err) return console.error(err);
            var draft_response = draft_data.toString();

            form_post_data = updatePostDataParams(form_post_data, draft_response, params);

            var url = "e/1FAIpQLSfinqg-ZeBcDh6z3r4WFcwHNH_u7ARx5RyTjNP6n_XPMvWghQ";
            var edit = "?edit2=" + params.VAR_EDIT_LINK;
            sendForm(url, form_post_data, language, "REGISTER_TO_HIKES_UPDATED", res, memory, edit);
        });    
    });
}

function sendForm(formId, body, language, recast_reply, res, memory, edit)
{
    // An object of options to indicate where to post to
    var request = require('request');
    console.log("url: " + "https://docs.google.com/forms/d/"+formId+"/formResponse"+edit);
    console.log("body: " + body);

    request({
        url: "https://docs.google.com/forms/d/"+formId+"/formResponse"+edit,
        method: "POST",
        headers: {
            "content-type": "application/x-www-form-urlencoded",  
        },
        body: body
    }, function (error, response, body){
        if (error) {
            console.log(error);
        }

        switch (recast_reply) {
            case "REGISTER_TO_HIKES_SUCCESS":
                var editlink = body.substr(0,body.indexOf("\">Edit your response"));
                editlink = editlink.substr(editlink.lastIndexOf("edit2=") + 6);
                console.log(editlink);
        
                for (var editform in memory.registertohikes.hikeseditforms)
                {
                    if (memory.registertohikes.hikeseditforms[editform].link == "") {
                        memory.registertohikes.hikeseditforms[editform].link = editlink;
                    }
                };
                console.log("registertohikes " + JSON.stringify(memory.registertohikes));

                var phonenumber = memory.registertohikes["phone number"];
                if (phonenumber.indexOf("@") == -1) {
                    phonenumber = phonenumber.replace("-","");
                }   

                var registerObj = {
                    name: memory.registertohikes.name,
                    email: memory.registertohikes.email,
                    selectedhikes: memory.registertohikes.selectedhikes,
                    "phone number": memory.registertohikes["phone number"],
                    "share my age": memory.registertohikes["share my age"],
                    age: memory.registertohikes.age,
                    "i'm gay": memory.registertohikes["i'm gay"],
                    "heard of the group": memory.registertohikes["heard of the group"],
                    hikeseditforms: memory.registertohikes.hikeseditforms,
                    lastageupdate: memory.registertohikes.lastageupdate,
                    "car/ride": memory.registertohikes["car/ride"],
                    "plays on": memory.registertohikes["plays on"],
                    "comes from": memory.registertohikes["comes from"],
                    "returns to": memory.registertohikes["returns to"],
                    "can organize": memory.registertohikes["can organize"],
                    "saved the date": memory.registertohikes["saved the date"],
                    "i fear of": memory.registertohikes["i fear of"],
                    "friends joining": memory.registertohikes["friends joining"],
                    "available places": memory.registertohikes["available places"],
                    friendsdetails: memory.friendsdetails,
                    "i approve":memory.registertohikes["iapprove"],
                };

                dbservices.replaceonelastregister(res, phonenumber, registerObj)
                .catch(rejection => {
                    logservices.logRejection(rejection);
                });

                var recast_conversation_reply;
        
                recast_conversation_reply = replies.get_recast_reply("REGISTER_TO_HIKES_SUCCESS",language,null,memory);
                for (let index = 0; index < recast_conversation_reply.replies.length; index++) {
                    recast_conversation_reply.replies[index].content = 
                        recast_conversation_reply.replies[index].content
                            .replace("TPHONE",process.env.TAL_PHONE);
                }
        
                res.status(200).json(recast_conversation_reply);        
                break;
            case "REGISTER_TO_HIKES_UPDATED":
                console.log("registertohikes " + JSON.stringify(memory.registertohikes));

                var phonenumber = memory.registertohikes["phone number"];
                if (phonenumber.indexOf("@") == -1) {
                    phonenumber = phonenumber.replace("-","");
                }
        
                var registerObj = {
                    name: memory.registertohikes.name,
                    email: memory.registertohikes.email,
                    selectedhikes: memory.registertohikes.selectedhikes,
                    "phone number": memory.registertohikes["phone number"],
                    "share my age": memory.registertohikes["share my age"],
                    age: memory.registertohikes.age,
                    "i'm gay": memory.registertohikes["i'm gay"],
                    "heard of the group": memory.registertohikes["heard of the group"],
                    hikeseditforms: memory.registertohikes.hikeseditforms,
                    lastageupdate: memory.registertohikes.lastageupdate,
                    "car/ride": memory.registertohikes["car/ride"],
                    "plays on": memory.registertohikes["plays on"],
                    "comes from": memory.registertohikes["comes from"],
                    "returns to": memory.registertohikes["returns to"],
                    "can organize": memory.registertohikes["can organize"],
                    "saved the date": memory.registertohikes["saved the date"],
                    "i fear of": memory.registertohikes["i fear of"],
                    "friends joining": memory.registertohikes["friends joining"],
                    "available places": memory.registertohikes["available places"],
                    friendsdetails: memory.friendsdetails,
                    "i approve":memory.registertohikes["iapprove"],
                };

                dbservices.replaceonelastregister(res, phonenumber, registerObj)
                .catch(rejection => {
                    logservices.logRejection(rejection);
                });

                var recast_conversation_reply;

                switch (memory.operation) {
                    case "edithike":
                        recast_conversation_reply = replies.get_recast_reply("REGISTER_TO_HIKES_UPDATED",language,null,memory);
                        break;
                    case "cancel":
                        recast_conversation_reply = replies.get_recast_reply("REGISTER_TO_HIKES_CANCEL",language,null,memory);
                        break;
                    default:
                        break;
                }
        
                res.status(200).json(recast_conversation_reply);    
                break;
            default:
                break;
        }
    });
}

function setAvailableHikesReply(recast_conversation_reply, hikes, lang, title)
{
    hikes = tools.remove_past_hikes(hikes);
    hikes = tools.sort_hikes(hikes);

    if (title == null) {
        title = replies.get_conversation_string("WHICH_HIKE_REGISTER", lang);
    }
    recast_conversation_reply = replies.push_quick_reply_to_recast(recast_conversation_reply, title);
    for (let index = 0; index < hikes.length; index++) {
        const hike = hikes[index];
        
        if (hike.hasOwnProperty("hikenamehebrew")) {
            switch (lang) {
                case "he":
                    recast_conversation_reply = 
                        replies.push_quick_reply_option_to_recast(recast_conversation_reply, hike.hikenamehebrew);
                    break;
                case "en":
                    recast_conversation_reply = 
                        replies.push_quick_reply_option_to_recast(recast_conversation_reply, hike.hikenameenglish);
                    break;
                default:
                    break;
            }                
        }
        else {
            recast_conversation_reply = 
                replies.push_quick_reply_option_to_recast(recast_conversation_reply, hike);
        }
    }
    console.log("setAvailableHikesReply: " + JSON.stringify(recast_conversation_reply));
    return recast_conversation_reply;
}

function setAvailableHikesReplyBut(recast_conversation_reply, hikes, lang, selectedHikes)
{
    hikes = tools.remove_past_hikes(hikes);
    hikes = tools.sort_hikes(hikes);

    var title = replies.get_conversation_string("SELECT_MORE_HIKES", lang);
    recast_conversation_reply = replies.push_quick_reply_to_recast(recast_conversation_reply, title);
    switch (lang) {
        case "he":
            recast_conversation_reply = 
                replies.push_quick_reply_option_to_recast(recast_conversation_reply, "סיים");
            break;
        case "en":
            recast_conversation_reply = 
                replies.push_quick_reply_option_to_recast(recast_conversation_reply, "End");
            break;
        default:
            break;
    }
    for (let index = 0; index < hikes.length; index++) {
        const hike = hikes[index];
        
        switch (lang) {
            case "he":
                if (selectedHikes.indexOf(hike.hikenamehebrew) != -1) {
                    continue;
                }
                recast_conversation_reply = 
                    replies.push_quick_reply_option_to_recast(recast_conversation_reply, hike.hikenamehebrew);
                break;
            case "en":
                if (selectedHikes.indexOf(hike.hikenameenglish) != -1) {
                    continue;
                }
                recast_conversation_reply = 
                    replies.push_quick_reply_option_to_recast(recast_conversation_reply, hike.hikenameenglish);
                break;
            default:
                break;
        }
    }
    console.log("setAvailableHikesReply: " + JSON.stringify(recast_conversation_reply));
    return recast_conversation_reply;
}

function updateCarpool(res) {
    sendForm("1EV8BBJfZGseTFzJo-EMcgZdPHzedRC8zTZyfyRw2LoQ", "" , "", "Update only carpool", res, null, "");
}

function updateHistoryData(res, start, end) {
    var params = {
        VAR_LINE_NUMBERS: start + "-" + end,
        VAR_WHAT_TO_UPDATE: "History from beginning",
    }
    var fs = require('fs');
    fs.readFile('./resources/trigger_post_data.text', function (err, post_data) {
        if (err) return console.error(err);
        var form_post_data = post_data.toString();

        form_post_data = updateTriggerPostDataParams(form_post_data, params);
        sendForm("1EV8BBJfZGseTFzJo-EMcgZdPHzedRC8zTZyfyRw2LoQ", form_post_data , "", "History from beginning", res, null, "");
    });
}

function updateTriggerPostDataParams(form_post_data, params) {
    form_post_data = form_post_data.replace("VAR_LINE_NUMBERS", encodeURIComponent(params.VAR_LINE_NUMBERS));
    form_post_data = form_post_data.replace("VAR_WHAT_TO_UPDATE", encodeURIComponent(params.VAR_WHAT_TO_UPDATE));
    return form_post_data;
}

function updatePostDataParams(form_post_data, draft_response, params) {
    var hikes = "";
    for (let index = 0; index < params.VAR_NEW_HIKES_LIST.length; index++) {
        const element = params.VAR_NEW_HIKES_LIST[index];
        hikes += "&entry.362682837="+encodeURIComponent(element);
    }

    if (params.VAR_FRIEND2_SAVE_THE_DATE.length < 2) {
        params.VAR_FRIEND2_SAVE_THE_DATE = "לא רלוונטי"
    }
    if (params.VAR_FRIEND3_SAVE_THE_DATE.length < 2) {
        params.VAR_FRIEND3_SAVE_THE_DATE = "לא רלוונטי"
    }
    if (params.VAR_FRIEND4_SAVE_THE_DATE.length < 2) {
        params.VAR_FRIEND4_SAVE_THE_DATE = "לא רלוונטי"
    }

    // Replace stub with params
    form_post_data = form_post_data.replace("VAR_EMAIL", params.VAR_EMAIL);
    draft_response = draft_response.replace("VAR_LANGUAGE", params.VAR_LANGUAGE);
    draft_response = draft_response.replace("VAR_EMAIL", params.VAR_EMAIL);
    draft_response = draft_response.replace("VAR_NAME", params.VAR_NAME);
    draft_response = draft_response.replace("VAR_NEW_HIKES_LIST", JSON.stringify(params.VAR_NEW_HIKES_LIST));
    draft_response = draft_response.replace("VAR_WHERE_FROM", params.VAR_WHERE_FROM);
    draft_response = draft_response.replace("VAR_WHERE_TO", params.VAR_WHERE_TO);
    draft_response = draft_response.replace("VAR_HAVE_A_CAR", params.VAR_HAVE_A_CAR);
    draft_response = draft_response.replace("VAR_AVAILABLE_PLACES", params.VAR_AVAILABLE_PLACES);
    draft_response = draft_response.replace("VAR_PHONENUMBER", params.VAR_PHONENUMBER);
    draft_response = draft_response.replace("VAR_SAVED_THE_DATE", params.VAR_SAVED_THE_DATE);
    draft_response = draft_response.replace("VAR_I_FEAR_OF", params.VAR_I_FEAR_OF);
    draft_response = draft_response.replace("VAR_SHARE_MY_AGE", params.VAR_SHARE_MY_AGE);
    draft_response = draft_response.replace("VAR_MY_AGE", params.VAR_MY_AGE);
    draft_response = draft_response.replace("VAR_COME_WITH_FRIENDS", params.VAR_COME_WITH_FRIENDS);
    draft_response = draft_response.replace("VAR_FRIEND1_NAME", params.VAR_FRIEND1_NAME);
    draft_response = draft_response.replace("VAR_FRIEND2_NAME", params.VAR_FRIEND2_NAME);
    draft_response = draft_response.replace("VAR_FRIEND3_NAME", params.VAR_FRIEND3_NAME);
    draft_response = draft_response.replace("VAR_FRIEND4_NAME", params.VAR_FRIEND4_NAME);
    draft_response = draft_response.replace("VAR_FRIEND1_SAVE_THE_DATE", params.VAR_FRIEND1_SAVE_THE_DATE);
    draft_response = draft_response.replace("VAR_FRIEND2_SAVE_THE_DATE", params.VAR_FRIEND2_SAVE_THE_DATE);
    draft_response = draft_response.replace("VAR_FRIEND3_SAVE_THE_DATE", params.VAR_FRIEND3_SAVE_THE_DATE);
    draft_response = draft_response.replace("VAR_FRIEND4_SAVE_THE_DATE", params.VAR_FRIEND4_SAVE_THE_DATE);
    if (params.VAR_EDIT_LINK) {
        draft_response = draft_response.replace("VAR_EDIT_LINK", params.VAR_EDIT_LINK);
    }
    else {
        draft_response = draft_response.replace("VAR_EDIT_LINK", null);
    }
    draft_response = draft_response.replace("VAR_ARE_YOU_GAY", params.VAR_ARE_YOU_GAY);
    draft_response = draft_response.replace("VAR_BEEN_IN_HIKES", params.VAR_BEEN_IN_HIKES);
    draft_response = draft_response.replace("VAR_PLAYSON", params.VAR_PLAYSON);
    draft_response = draft_response.replace("VAR_ORGANIZE", params.VAR_ORGANIZE);
    draft_response = draft_response.replace("VAR_SELF_RESPONSIBILITY", encodeURIComponent("מבין ומקבל"));
    draft_response = draft_response.replace("\n","");
    form_post_data = form_post_data.replace("VAR_LANGUAGE", encodeURIComponent(params.VAR_LANGUAGE));
    form_post_data = form_post_data.replace("VAR_NAME", encodeURIComponent(params.VAR_NAME));
    form_post_data = form_post_data.replace("VAR_NEW_HIKES_LIST", hikes);
    form_post_data = form_post_data.replace("VAR_WHERE_FROM", encodeURIComponent(params.VAR_WHERE_FROM));
    form_post_data = form_post_data.replace("VAR_WHERE_TO", encodeURIComponent(params.VAR_WHERE_TO));
    form_post_data = form_post_data.replace("VAR_HAVE_A_CAR", encodeURIComponent(params.VAR_HAVE_A_CAR));
    form_post_data = form_post_data.replace("VAR_AVAILABLE_PLACES", encodeURIComponent(params.VAR_AVAILABLE_PLACES));
    form_post_data = form_post_data.replace("VAR_PHONENUMBER", encodeURIComponent(params.VAR_PHONENUMBER));
    form_post_data = form_post_data.replace("VAR_SAVED_THE_DATE", encodeURIComponent(params.VAR_SAVED_THE_DATE));
    form_post_data = form_post_data.replace("VAR_I_FEAR_OF", encodeURIComponent(params.VAR_I_FEAR_OF));
    form_post_data = form_post_data.replace("VAR_SHARE_MY_AGE", encodeURIComponent(params.VAR_SHARE_MY_AGE));
    form_post_data = form_post_data.replace("VAR_MY_AGE", encodeURIComponent(params.VAR_MY_AGE));
    form_post_data = form_post_data.replace("VAR_COME_WITH_FRIENDS", encodeURIComponent(params.VAR_COME_WITH_FRIENDS));
    form_post_data = form_post_data.replace("VAR_FRIEND1_NAME", encodeURIComponent(params.VAR_FRIEND1_NAME));
    form_post_data = form_post_data.replace("VAR_FRIEND2_NAME", encodeURIComponent(params.VAR_FRIEND2_NAME));
    form_post_data = form_post_data.replace("VAR_FRIEND3_NAME", encodeURIComponent(params.VAR_FRIEND3_NAME));
    form_post_data = form_post_data.replace("VAR_FRIEND4_NAME", encodeURIComponent(params.VAR_FRIEND4_NAME));
    form_post_data = form_post_data.replace("VAR_FRIEND1_SAVE_THE_DATE", encodeURIComponent(params.VAR_FRIEND1_SAVE_THE_DATE));
    form_post_data = form_post_data.replace("VAR_FRIEND2_SAVE_THE_DATE", encodeURIComponent(params.VAR_FRIEND2_SAVE_THE_DATE));
    form_post_data = form_post_data.replace("VAR_FRIEND3_SAVE_THE_DATE", encodeURIComponent(params.VAR_FRIEND3_SAVE_THE_DATE));
    form_post_data = form_post_data.replace("VAR_FRIEND4_SAVE_THE_DATE", encodeURIComponent(params.VAR_FRIEND4_SAVE_THE_DATE));
    form_post_data = form_post_data.replace("VAR_ARE_YOU_GAY", encodeURIComponent(params.VAR_ARE_YOU_GAY));
    form_post_data = form_post_data.replace("VAR_BEEN_IN_HIKES", encodeURIComponent(params.VAR_BEEN_IN_HIKES));
    form_post_data = form_post_data.replace("VAR_PLAYSON", encodeURIComponent(params.VAR_PLAYSON));
    form_post_data = form_post_data.replace("VAR_ORGANIZE", encodeURIComponent(params.VAR_ORGANIZE));
    form_post_data = form_post_data.replace("VAR_SELF_RESPONSIBILITY", encodeURIComponent("מבין ומקבל"));
    form_post_data = form_post_data.replace("VAR_DRAFT_RESPONSE",encodeURIComponent(draft_response));
    return(form_post_data);
}