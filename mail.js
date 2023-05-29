module.exports = {
    emailAfterHikeMatch: emailAfterHikeMatch,
    joinEmailUpdates: joinEmailUpdates,
    joinEmailAndWhatsAppUpdates: joinEmailAndWhatsAppUpdates
};

function emailAfterHikeMatch(hiker1address, hiker2address, hiker1name, hiker2name, hiker1phone, hiker2phone) {
    // create reusable transporter object using the default SMTP transport
    var mailjet = require ('node-mailjet')
    mailjet = mailjet.apiConnect(
        process.env.MJ_APIKEY_PUBLIC,
        process.env.MJ_APIKEY_PRIVATE,
        {
          config: {},
          options: {}
        } 
    );

    var subject = 'יש התאמה אחרי טיול ❤️'
    var mailbody = `<h2>היי ${hiker1name}!</h2>
    <br/><br/>
    <strong>גם ${hiker2name} סימן שמתאים לו להכיר אותך</strong>, 
    <br/>
    מספר הטלפון שלו הוא ${hiker2phone}.
    <br/><br/>
    שתהיה המון הצלחה לשניכם!`; // html body

    var request = mailjet
    .post("send", {'version': 'v3.1'})
    .request({
    "Messages":[
        {
        "From": {
            "Email": "tiulimg@gmail.com",
            "Name": "רובוט קבוצת הטיולים"
        },
        "To": [
            {
            "Email": hiker1address,
            "Name": hiker1name
            }
        ],
        "Subject": subject,
        "HTMLPart": mailbody,
        "CustomID": "AfterHikeMatch"
        }
    ]
    })
    request
    .then((result) => {
        console.log(result.body)
    })
    .catch((err) => {
        console.log(err.statusCode)
    })

    mailbody = `<h2>היי ${hiker2name}!</h2>
    <br/><br/>
    <strong>גם ${hiker1name} סימן שמתאים לו להכיר אותך</strong>, 
    <br/>
    מספר הטלפון שלו הוא ${hiker1phone}.
    <br/><br/>
    שתהיה המון הצלחה לשניכם!`; // html body

    request = mailjet
    .post("send", {'version': 'v3.1'})
    .request({
    "Messages":[
        {
        "From": {
            "Email": "tiulimg@gmail.com",
            "Name": "רובוט קבוצת הטיולים"
        },
        "To": [
            {
            "Email": hiker2address,
            "Name": hiker2name
            }
        ],
        "Subject": subject,
        "HTMLPart": mailbody,
        "CustomID": "AfterHikeMatch"
        }
    ]
    })
    request
    .then((result) => {
        console.log(result.body)
    })
    .catch((err) => {
        console.log(err.statusCode)
    })

    mailbody = `<h2>היי!</h2>
    <br/><br/>
    <strong>איזה כיף! יש התאמה בין  ${hiker1name} ל- ${hiker2name}</strong>, 
    <br/>
    שיהיה להם הרבה בהצלחה!`; // html body

    request = mailjet
    .post("send", {'version': 'v3.1'})
    .request({
    "Messages":[
        {
        "From": {
            "Email": "tiulimg@gmail.com",
            "Name": "רובוט קבוצת הטיולים"
        },
        "To": [
            {
            "Email": "tiulimg@gmail.com",
            "Name": "קבוצת הטיולים"
            }
        ],
        "Subject": subject,
        "HTMLPart": mailbody,
        "CustomID": "AfterHikeMatch"
        }
    ]
    })
    request
    .then((result) => {
        console.log(result.body)
    })
    .catch((err) => {
        console.log(err.statusCode)
    })
}

function joinEmailUpdates(myname, email, phonenumber, isgay, howdidihear, language) {
    // create reusable transporter object using the default SMTP transport
    var mailjet = require ('node-mailjet')
    mailjet = mailjet.apiConnect(
        process.env.MJ_APIKEY_PUBLIC,
        process.env.MJ_APIKEY_PRIVATE,
        {
          config: {},
          options: {}
        } 
    );

    var subject = "Join hiking group updates";
    var mailbody = `${myname} is requesting to join hike updates.
    <br/><br/>
    His email is ${email} and his phone number is ${phonenumber}
    <br/>
    I'm gay: ${isgay} 
    <br/>
    Heard of hikes: ${howdidihear}`;

    switch (language) {
        case "he":
            var mailbody = `${myname} מבקש להצטרף לעדכונים על הטיולים.
            <br/><br/>
            המייל שלו הוא ${email} ומספר הטלפון הוא ${phonenumber}
            <br/>
            אני גיי: ${isgay} 
            <br/>
            שמעתי על הטיולים: ${howdidihear}`;
            subject = "להצטרף לעדכונים";
            break;
        case "en":
            break;
        default:
            break;
    }

    const request = mailjet
    .post("send", {'version': 'v3.1'})
    .request({
    "Messages":[
        {
        "From": {
            "Email": "tiulimg@gmail.com",
            "Name": "רובוט קבוצת הטיולים"
        },
        "To": [
            {
            "Email": "tiulimg@gmail.com",
            "Name": "קבוצת הטיולים"
            }
        ],
        "Subject": subject,
        "HTMLPart": mailbody,
        "CustomID": "JoinUpdates"
        }
    ]
    })
    request
    .then((result) => {
        console.log(result.body)
    })
    .catch((err) => {
        console.log(err.statusCode)
    })
}

function joinEmailAndWhatsAppUpdates(myname, email, phonenumber, which_to_join) {
    // create reusable transporter object using the default SMTP transport
    var mailjet = require ('node-mailjet')
    mailjet = mailjet.apiConnect(
        process.env.MJ_APIKEY_PUBLIC,
        process.env.MJ_APIKEY_PRIVATE,
        {
          config: {},
          options: {}
        } 
    );

    var mailbody = `${myname} מבקש להצטרף לעדכונים על הטיולים.
    <br/><br/>
    המייל שלו הוא ${email} ומספר הטלפון הוא ${phonenumber}
    <br/>
    מבקש להצטרף ל-${which_to_join}`;
    var subject = "להצטרף לעדכונים";

    const request = mailjet
    .post("send", {'version': 'v3.1'})
    .request({
    "Messages":[
        {
        "From": {
            "Email": "tiulimg@gmail.com",
            "Name": "רובוט קבוצת הטיולים"
        },
        "To": [
            {
            "Email": "tiulimg@gmail.com",
            "Name": "קבוצת הטיולים"
            }
        ],
        "Subject": subject,
        "HTMLPart": mailbody,
        "CustomID": "JoinUpdates"
        }
    ]
    })
    request
    .then((result) => {
        console.log(result.body)
    })
    .catch((err) => {
        console.log(err.statusCode)
    })
}