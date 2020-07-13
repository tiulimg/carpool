var request = require('request');
var Promise = require('promise');

var dbservices = require("./dbservices");
var logservices = require("./logservices");
var tools = require("./tools");
var messageconnector = require("./messageconnector");

module.exports = {
    getconversations: getconversations,
    getconversationstate: getconversationstate,
    saveconversationidtoall: saveconversationidtoall,
    allchatstoenglish: allchatstoenglish,
    chattoenglish: chattoenglish,
    verifyplanstocome: verifyplanstocome,
}

function getconversations(res, conversationid, phonenumber) {
    return new Promise((resolve, reject) => {
        var specificconversation = "";
        if (conversationid && !phonenumber) {
            specificconversation = "/" + conversationid;
        }
        var url = "https://api.cai.tools.sap/connect/v1/conversations" + specificconversation;
        request({
            url: url,
            method: "GET",
            headers: {
                Authorization: "Token " + process.env.SAP_TOKEN,
                "Content-Type": "application/json",
            },
        }, function (error, response, body){
            if (error) {
                console.log(error);
                return null;
            }
            else {
                var conversations;
                try {
                    conversations = JSON.parse(response.body);
                } catch (error) {
                    console.log("getconversations " + response.body);
                }

                if (conversations && conversations.results) {

                    if (conversationid) {
                        var conversation;
                        for (let index = 0; index < conversations.results.length; index++) {
                            const result = conversations.results[index];
                            if (result.id == conversationid) {
                                conversation = result;
                                break;
                            }
                        }
    
                        var senderId;
                        if (conversation) {
                            senderId = conversation.chatId;
                            if (senderId && phonenumber) {

                                dbservices.replaceconversationid(res, conversationid, phonenumber, {
                                    conversationid: conversationid,
                                    phonenumber: phonenumber,
                                    senderId: senderId,
                                }).then(() => {
                                    return resolve(conversation.results);
                                })
                                .catch(rejection => {
                                    logservices.logRejection(rejection);
                                });
                            }
                            else {
                                return resolve(conversation.results);
                            }
                        }
                        else {
                            return resolve(conversations);
                        }    
                    }
                    else {
                        return resolve(conversations);
                    }
                }
                else {
                    return resolve(null);
                }
            }
        });
    });
}

function getconversationstate(id) {
    return new Promise((resolve, reject) => {
        if (id) {
            request({
                url: "https://api.cai.tools.sap/build/v1/users/zanzamer/bots/tiulimg/versions/v4-registration-to-hikes/" + 
                    "builder/conversation_states/" + id,
                method: "GET",
                headers: {
                    Authorization: "Token " + process.env.SAP_TOKEN,
                    "Content-Type": "application/json",
                },
            }, function (error, response, body){
                if (error) {
                    console.log(error);
                }
                else {
                    var conversation;
                    try {
                        conversation = JSON.parse(response.body);
                    } catch (error) {
                        console.log("getconversationstate " + response.body);
                    }
                    return resolve(conversation.results);
                }
            });
        }
        else {
            return resolve();
        }
    });
}

async function saveconversationidtoall(res) {
    var conversations = await getconversations();
    if (conversations && conversations.results) {
        for (let index = 0; index < conversations.results.length; index++) {
            const id = conversations.results[index].id;
            console.log("saveconversationidtoall id " + id + " index " + index);
            await tools.wait(500);
            var conversationstate = await getconversationstate(id);
            var found = false;
            var phonenumber;
            if (conversationstate && conversationstate.memory) {
                var memory = conversationstate.memory;
                phonenumber = memory.phonenumber;
                if (phonenumber) {
                    found = true;
                    console.log("saveconversationidtoall " + id + " found phonenumber " + phonenumber);
                    phonenumber = tools.normalize_phonenumber(phonenumber);
                    await tools.wait(500);
                    await getconversations(res, id, phonenumber);
                }
            }
            if (!found) {
                phonenumber = null;
                console.log("saveconversationidtoall " + id + " not found phonenumber " + phonenumber);
                await tools.wait(500);
                var conversation = await getconversations(res, id);
                if (conversation && conversation.results && conversation.results.messages && conversation.results.participants) {
                    conversation = conversation.results;
                    var bots = [];
                    for (let indexparticipant = 0; indexparticipant < conversation.participants.length; indexparticipant++) {
                        const participant = conversation.participants[indexparticipant];
                        if (participant.isBot) {
                            bots.push(participant.id);
                        }
                    }
                    for (let indexmessage = 0; indexmessage < conversation.messages.length; indexmessage++) {
                        const message = conversation.messages[indexmessage];
                        if (bots.indexOf(message.participant) == -1 && message.attachment.type == "text") {
                            var content = message.attachment.content;
                            var isphone = content.match(/(\d+){10}/);
                            console.log("saveconversationidtoall " + id + " phone " + isphone + " text " + content);
                            if (isphone) {
                                phonenumber = isphone[0];
                            }
                        }
                    }
                    if (phonenumber) {
                        console.log("saveconversationidtoall " + id + " found phonenumber " + phonenumber);
                        phonenumber = tools.normalize_phonenumber(phonenumber);
                        await tools.wait(500);
                        await getconversations(res, id, phonenumber);
                    }
                }
            }
        }
    }
}

function allchatstoenglish() {
    return new Promise((resolve, reject) => {
        getconversations()
        .then(conversations => {
            if (conversations) {
                for (let index = 0; index < conversations.results.length; index++) {
                    const id = conversations.results[index].id;
                    
                    tools.wait(index * 500)
                    .then(() => {
                        request({
                            url: "https://api.cai.tools.sap/build/v1/users/zanzamer/bots/tiulimg/versions/v4-registration-to-hikes/" + 
                                "builder/conversation_states/" + id,
                            method: "PUT",
                            headers: {
                                Authorization: "Token " + process.env.SAP_TOKEN,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                language: "en",
                            }),
                        }, function (error, response, body){
                            if (error) {
                                console.log(error);
                            }
                            else {
                                console.log(JSON.stringify(response.body));
                            }
                        });
                    })
                    .catch(rejection => {
                        logservices.logRejection(rejection);
                    });
                }
            }
            return resolve();
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    });
}

function chattoenglish(res, conversationid) {
    return new Promise((resolve, reject) => {
        getconversations(res, conversationid)
        .then(conversation => {
            if (conversation && conversation.id) {
                const id = conversation.id;
                request({
                    url: "https://api.cai.tools.sap/build/v1/users/zanzamer/bots/tiulimg/versions/v4-registration-to-hikes/" + 
                        "builder/conversation_states/" + id,
                    method: "PUT",
                    headers: {
                        Authorization: "Token " + process.env.SAP_TOKEN,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        language: "en",
                    }),
                }, function (error, response, body){
                    if (error) {
                        console.log(error);
                    }
                    else {
                        console.log(JSON.stringify(response.body));
                        return resolve();
                    }
                });
            }
            else {
                return resolve();
            }
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    });
}

function verifyplanstocome(res, hikes) {
    for (let index = 0; index < nearhikes.length; index++) {
        var hike = nearhikes[index];
        var hikers = await dbservices.gethikersbyhikedate(res, hike.hikedate);
        for (let indexhiker = 0; indexhiker < hikers.length; indexhiker++) {
            const hiker = hikers[indexhiker];
            var conversationid = await dbservices.getconversationid(res, hiker.phone);

            var message = "היי 🙂 מה קורה?\n";
            message += "זה טל, נרשמת לטיול ב-" + hike.hikenamehebrew + "\n";
            if (hiker.myfriends && hiker.myfriends.length > 0) {
                var withfriends = "";
                message += "תבוא בע\"ה עם ";
                for (let indexfriend = 0; indexfriend < hiker.myfriends.length; indexfriend++) {
                    const friend = hiker.myfriends[indexfriend];
                    message += friend + ", ";
                }
                message = message.substr(0, message.length - 2) + "?";
            }
            else {
                message += "תבוא בע\"ה?";
            }
            console.log(message);
            if (false && conversationid != null) {
                var hyphen = conversationid.senderId.indexOf("-");
                if (hyphen == -1) {
                    messageconnector.sendToTelegram(res, conversationid.senderId, message);
                }
                else {
                    var facebookId = conversationid.senderId.substr(0, hyphen);
                    messageconnector.sendToFacebookMessenger(res, conversationid.senderId, message);
                }
            }
        }
    }
}