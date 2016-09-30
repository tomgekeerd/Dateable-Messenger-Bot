'use strict'

var api = require("./api.js");
const express = require('express')
const bodyParser = require('body-parser')
const app = express()

app.set('port', (process.env.PORT || 5000))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// parse application/json
app.use(bodyParser.json())

// index
app.get('/', function (req, res) {
    res.send('hello world i am a secret bot')
})

// for facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'toeken133') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

// to post data
app.post('/webhook/', function (req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text
            if (text === 'Generic') {
                api.sendGenericMessage(sender)
                continue
            }
            api.sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
        }
        if (event.postback) {
            let postback = event.postback.payload
            switch (postback) {
                case "getStarted":
                    api.sendTextMessage(sender, "Alright, let's get started!");
                    api.sendGreetingMessage(sender);
                    api.getUserInsights(sender);
                    console.log(firstname, lastname, locale);
                break;

                default:
                    api.sendTextMessage(sender, "A postback without understandance");
            }
            continue
        }
    }
    res.sendStatus(200)
})

// spin spin sugar
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})