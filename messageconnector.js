var request = require('request');
var Promise = require('promise');

var logservices = require("./logservices");

module.exports = {
    sendToFacebookMessenger: sendToFacebookMessenger,
    sendToTelegram: sendToTelegram,
    sendToCallmebotWhatsapp: sendToCallmebotWhatsapp,
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

function sendToTelegram(res, senderId, message) {
    return new Promise((resolve, reject) => {
        var url = "https://api.telegram.org/bot"+process.env.TELEGRAM_TOKEN+"/sendMessage";
        var body = {
            "chat_id": senderId,
            "text": message,
        };

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
            console.log("sendToTelegram response.body " + JSON.stringify(response.body));
            return resolve();
        });
    });
}

function sendToCallmebotWhatsapp(res, phonenumber, message) {
    return new Promise((resolve, reject) => {
        var messageurlencoded = encodeURIComponent(message);
        var phonenumberwithoutzero = phonenumber;
        if (phonenumber[0] == '0') {
            phonenumberwithoutzero = phonenumberwithoutzero.substr(1);
        }
        var url = "https://api.callmebot.com/whatsapp.php?phone=+972"+phonenumberwithoutzero+"&text="+messageurlencoded+"&apikey="+
            process.env.CALLMEBOT_APIKEY;
        
        request({
            url: url,
            method: "GET",
        }, function (error, response, body){
            if (error) {
                console.log(error);
                return reject(error);
            }
            console.log("sendToCallmebotWhatsapp response.body " + JSON.stringify(response.body));
            return resolve();
        });
    });
}