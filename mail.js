module.exports = {
    emailAfterHikeMatch: emailAfterHikeMatch,
    joinEmailUpdates: joinEmailUpdates
};
    
function emailAfterHikeMatch(hiker1address, hiker2address, hiker1name, hiker2name, hiker1phone, hiker2phone) {
    // create reusable transporter object using the default SMTP transport
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '"קבוצת טיולים" <tiulimg@gmail.com>', // sender address
        to: hiker1address, // list of receivers
        // to: "tiulimg@gmail.com", // list of receivers
        subject: 'יש התאמה אחרי טיול ❤️', // Subject line
        //text: 'Hello world ?', // plaintext body
        html: `<h2>היי ${hiker1name}!</h2>
        
        <strong>גם ${hiker2name} סימן שמתאים לו להכיר אותך</strong>, 
        מספר הטלפון שלו הוא ${hiker2phone}.
        
        שתהיה המון הצלחה לשניכם!` // html body
    };

    // send mail with defined transport object
    sgMail
    .send(mailOptions)
    .catch((error) => {
        console.error(error)
    })

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '"קבוצת טיולים" <tiulimg@gmail.com>', // sender address
        to: hiker2address, // list of receivers
        // to: "zanzamer@gmail.com", // list of receivers
        subject: 'יש התאמה אחרי טיול ❤️', // Subject line
        //text: 'Hello world ?', // plaintext body
        html: `<h2>היי ${hiker2name}!</h2>
        
        <strong>גם ${hiker1name} סימן שמתאים לו להכיר אותך</strong>, 
        מספר הטלפון שלו הוא ${hiker1phone}.
        
        שתהיה המון הצלחה לשניכם!` // html body
    };

    // send mail with defined transport object
    sgMail
    .send(mailOptions)
    .catch((error) => {
        console.error(error)
    })

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '"קבוצת טיולים" <tiulimg@gmail.com>', // sender address
        to: "tiulimg@gmail.com", // list of receivers
        subject: 'יש התאמה אחרי טיול ❤️', // Subject line
        //text: 'Hello world ?', // plaintext body
        html: `<h2>היי!</h2>
        
        <strong>איזה כיף! יש התאמה בין  ${hiker1name} ל- ${hiker2name}</strong>, 
        שיהיה להם הרבה בהצלחה!` // html body
    };

    // send mail with defined transport object
    sgMail
    .send(mailOptions)
    .catch((error) => {
        console.error(error)
    })
}

function joinEmailUpdates(myname, email, phonenumber, isgay, howdidihear, language) {
    // create reusable transporter object using the default SMTP transport
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    var subject = "Join hiking group updates";
    var mailbody = myname + ' is requesting to join hike updates.\r\n' +
        'His email is ' + email + ' and his phone number is ' + phonenumber + "\n" +
        "I'm gay: " + isgay + "\n" + "Heard of hikes: " + howdidihear;

    switch (language) {
        case "he":
            mailbody = myname + ' מבקש להצטרף לעדכונים על הטיולים.\r\n' +
            'המייל שלו הוא ' + email + ' ומספר הטלפון הוא ' + phonenumber + "\n" +
            "אני גיי: " + isgay + "\n" + "שמעתי על הטיולים: " + howdidihear;
            subject = "להצטרף לעדכונים";
            break;
        case "en":
            break;
        default:
            break;
    }

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '"קבוצת טיולים" <tiulimg@gmail.com>', // sender address
        to: '"קבוצת טיולים" <tiulimg@gmail.com>', // list of receivers
        subject: subject, // Subject line
        //text: 'Hello world ?', // plaintext body
        html: mailbody // html body
    };

    // send mail with defined transport object
    sgMail
    .send(mailOptions)
    .catch((error) => {
        console.error(error)
    })
}