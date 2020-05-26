var request = require('request');
var Promise = require('promise');

var logservices = require("./logservices");

module.exports = {
    sendToFacebookMessenger: sendToFacebookMessenger,
}

function sendToFacebookMessenger(res, senderId, message) {
    return new Promise((resolve, reject) => {
        var url = "https://graph.facebook.com/v7.0/me/messages?access_token="+process.env.PAGE_TOKEN;
        var body = {
            "messaging_type": "MESSAGE_TAG",
            "recipient": {
                "id": senderId,
            },
            "message": {
                "text": message,
            },
            "tag": "CONFIRMED_EVENT_UPDATE",
        };
        console.log("sendToFacebookMessenger request ");

        request({
            url: url,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        }, function (error, response, body){
            if (error) {
                console.log(error);
                return reject(error);
            }
            console.log("sendToFacebookMessenger response.body " + JSON.stringify(response.body));
            return resolve();
        });
    });
}
