var request = require('request');
//var fs = require('fs');

//var conversations = JSON.parse(fs.readFileSync('./conversations.json', 'utf8'));

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
