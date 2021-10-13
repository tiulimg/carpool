var nodemailer = require('nodemailer');

module.exports = {
    emailAfterHikeMatch: emailAfterHikeMatch,
};
    
function emailAfterHikeMatch(hiker1address, hiker2address, hiker1name, hiker2name, hiker1phone, hiker2phone) {
    // create reusable transporter object using the default SMTP transport
    var transport = nodemailer.createTransport({
        host: "smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: "62607fb3fb9470",
          pass: "643db5ef8a66fa"
        }
      });

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '"קבוצת טיולים" <zanzamer@gmail.com>', // sender address
        //to: hiker1address, // list of receivers
        to: "tiulimg@gmail.com", // list of receivers
        subject: 'יש התאמה אחרי טיול ❤️', // Subject line
        //text: 'Hello world ?', // plaintext body
        html: `<h2>היי ${hiker1name}!</h2>
        
        <strong>גם ${hiker2name} סימן שמתאים לו להכיר אותך</strong>, 
        מספר הטלפון שלו הוא ${hiker2phone}.
        
        שתהיה המון הצלחה לשניכם!` // html body
    };

    // send mail with defined transport object
    transport.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
    });

    // setup e-mail data with unicode symbols
    var mailOptions = {
        from: '"קבוצת טיולים" <tiulimg@gmail.com>', // sender address
        //to: hiker2address, // list of receivers
        to: "zanzamer@gmail.com", // list of receivers
        subject: 'יש התאמה אחרי טיול ❤️', // Subject line
        //text: 'Hello world ?', // plaintext body
        html: `<h2>היי ${hiker2name}!</h2>
        
        <strong>גם ${hiker1name} סימן שמתאים לו להכיר אותך</strong>, 
        מספר הטלפון שלו הוא ${hiker1phone}.
        
        שתהיה המון הצלחה לשניכם!` // html body
    };

    // send mail with defined transport object
    transport.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
    });
}