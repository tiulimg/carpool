var request = require('request');
var Promise = require('promise');

var dbservices = require("./dbservices");
var logservices = require("./logservices");
var tools = require("./tools");

module.exports = {
    getconversations: getconversations,
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
                console.log("getconversations conversations " + conversations);

                if (conversations && conversations.results) {
                    console.log("getconversations has results");

                    if (conversationid) {
                        var conversation;
                        for (let index = 0; index < conversations.results.length; index++) {
                            const result = conversations.results[index];
                            if (result.id == conversationid) {
                                conversation = result;
                                break;
                            }
                        }
                        console.log("getconversations conversation " + conversation);
    
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

function saveconversationidtoall(res) {
    return new Promise((resolve, reject) => {
        getconversations()
        .then(conversations => {
            console.log("saveconversationidtoall conversations " + conversations);
            if (conversations) {
                console.log("saveconversationidtoall conversations " + conversations.results.length);
                for (let index = 0; index < conversations.results.length; index++) {
                    const id = conversations.results[index].id;
                    console.log("saveconversationidtoall id " + id);
                    tools.wait((index * 1000) + 500)
                    .then(() => {
                        return getconversations(res, id, null);
                    })
                    .then(conversation => {
                        console.log("saveconversationidtoall conversation " + conversation + " " + JSON.stringify(conversation));
                        if (conversation && conversation.memory) {
                            console.log("saveconversationidtoall has memory");
                            var memory = conversation.memory;
                            var phonenumber = memory.phonenumber;
                            if (phonenumber) {
                                console.log("saveconversationidtoall has phonenumber");
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
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    });
}