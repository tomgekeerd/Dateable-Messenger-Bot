var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();

var port = process.env.PORT || 8080;
app.use(bodyParser.json());

//Your FanPageToken Generated in your FB App
var token = "EAAK1Sb4ieBIBAFCtI79pGWHzDfZCgBZAu6XOlcp6atKCKGVzFYoZBr0x1FACMpxK8BrZCdq2Dl6qbeUOgUTHqNyP73Am4HwVxLtPNS5SLxNw5ostvg1nyX7zAL9HHpDRzGoEyLtwjYZAjWSCPZAlsxhbPyhxiNYVgDlWPCyr6IuwZDZD";
var verify_token = "toeken133";

//Root EndPoint
app.get('/', function (req, res) {

    res.send('Facebook Messenger Bot root endpoint!');

});

//Setup Webhook
app.get('/webhook/', function (req, res) {

    if (req.query['hub.verify_token'] === verify_token) {
        res.send(req.query['hub.challenge']);
    }

    res.send('Error, wrong validation token');

});

app.post('/webhook/', function (req, res) {

    var messaging_events = req.body.entry[0].messaging;

    for (var i = 0; i < messaging_events.length; i++) {

        var event = req.body.entry[0].messaging[i];
        var sender = event.sender.id;

        if (event.message && event.message.text) {
            var text = event.message.text;

            // sendGenericMessage(sender)
            sendTextMessage(sender, "U w0t m8, echo: "+ text.substring(0, 200));
        }
    }

    res.sendStatus(200);

});

//App listen
app.listen(port, function () {

    console.log('Facebook Messenger Bot on port: ' + port);

});

//send Message with Facebook Graph Facebook v2.6

function sendGenericMessage(sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "First card",
                    "subtitle": "Element #1 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.messenger.com",
                        "title": "web url"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for first element in a generic bubble",
                    }],
                }, {
                    "title": "Second card",
                    "subtitle": "Element #2 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
                    "buttons": [{
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for second element in a generic bubble",
                    }],
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendTextMessage(sender, text) {

    var messageData = {
        text: text
    };

    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: token},
        method: 'POST',
        json: {
            recipient: {id: sender},
            message: messageData
        }
    }, function (error, response) {

        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }

    });

}