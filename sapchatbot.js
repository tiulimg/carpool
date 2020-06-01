var request = require('request');
var Promise = require('promise');

var dbservices = require("./dbservices");
var logservices = require("./logservices");
var tools = require("./tools");

module.exports = {
    getconversations: getconversations,
    getconversationstate: getconversationstate,
    saveconversationidtoall: saveconversationidtoall,
    allchatstoenglish: allchatstoenglish,
    chattoenglish: chattoenglish,
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

function saveconversationidtoall(res) {
    return new Promise((resolve, reject) => {
        getconversations()
        .then(conversations => {
            if (conversations) {
                for (let index = 0; index < conversations.results.length; index++) {
                    const id = conversations.results[index].id;
                    tools.wait((index * 1000) + 500)
                    .then(() => {
                        return getconversationstate(id);
                    })
                    .then(conversation => {
                        var found = false;
                        if (conversation && conversation.memory) {
                            var memory = conversation.memory;
                            var phonenumber = memory.phonenumber;
                            if (phonenumber) {
                                found = true;
                                console.log("saveconversationidtoall conversation " + conversation + " " + JSON.stringify(conversation));
                                phonenumber = tools.normalize_phonenumber(phonenumber);
                                tools.wait((index * 1000) + 1000)
                                .then(() => {
                                    return getconversations(res, id, phonenumber);
                                })
                                .catch(rejection => {
                                    logservices.logRejection(rejection);
                                });
                            }
                        }
                        if (!found) {
                            tools.wait((index * 2000) + 500)
                            .then(() => {
                                return getconversations(res, id);
                            })
                            .then(conversation => {
                                if (conversation && conversation.messages && conversation.participants) {
                                    var bots = [];
                                    for (let indexparticipant = 0; indexparticipant < conversation.participants.length; indexparticipant++) {
                                        const participant = conversation.participants[indexparticipant];
                                        if (participant.isBot) {
                                            bots.push(participant.id);
                                        }
                                    }
                                    var phonenumber;
                                    for (let indexmessage = 0; indexmessage < conversation.messages.length; indexmessage++) {
                                        const message = conversation.messages[indexmessage];
                                        if (bots.indexOf(message.participant) == -1 && message.attachment.type == "text") {
                                            var content = message.attachment.content;
                                            var isphone = content.match(/\d+{10}/);
                                            if (isphone) {
                                                phonenumber = isphone[0];
                                            }
                                        }
                                    }
                                    if (phonenumber) {
                                        tools.wait((index * 2000) + 500)
                                        .then(() => {
                                            return getconversations(res, id, phonenumber);
                                        })
                                        .catch(rejection => {
                                            logservices.logRejection(rejection);
                                        });
                                    }
                                }
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
            }
            return resolve();
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    });
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