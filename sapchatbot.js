var request = require('request');
var Promise = require('promise');

var dbservices = require("./dbservices");
var logservices = require("./logservices");

module.exports = {
    getconversations: getconversations,
    replaceconversationid: replaceconversationid,
}

function getconversations(conversationid, phonenumber) {
    return new Promise((resolve, reject) => {
        var url = "https://api.cai.tools.sap/connect/v1/conversations";
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
                var conversations = JSON.parse(response.body);
                if (conversationid && conversations && phonenumber) {
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
                    }
                    if (senderId) {
                        dbservices.replaceconversationid(res, conversationid, phonenumber, {
                            conversationid: conversationid,
                            phonenumber: phonenumber,
                            senderId: conversation.senderId,
                        }).then(() => {
                            return resolve(conversation);
                        })
                        .catch(rejection => {
                            logservices.logRejection(rejection);
                        });
                    }
                    else {
                        return resolve(conversations);
                    }
                }
                else {
                    return resolve(conversations);
                }
            }
        });
    });
}

function replaceconversationid(res, conversationid, phonenumber) {
    return new Promise((resolve, reject) => {
        dbservices.getconversationid(res, phonenumber, conversationid)
        .then(conversation => {
            if (!conversation) {
                getconversations(res, conversationid, phonenumber)
                .then(conversation => {
                    return resolve(conversations);
                })
                .catch(rejection => {
                    logservices.logRejection(rejection);
                });
            }
        })
        .catch(rejection => {
            logservices.logRejection(rejection);
        });
    });
}

function allchatstoenglish() {
    getconversations()
    .then(conversations => {
        for (let index = 0; index < conversations.results.length; index++) {
            const id = conversations.results[index].id;
            
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
        }
    })
    .catch(rejection => {
        logservices.logRejection(rejection);
    });
}

