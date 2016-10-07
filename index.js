'use strict'

const api = require("./api.js");
const express = require('express')
const bodyParser = require('body-parser')
const data = require('./data.json')
var pg = require('pg');
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
    console.log(messaging_events)
    for (let i = 0; i < messaging_events.length; i++) {

        let event = req.body.entry[0].messaging[i]
        console.log("This is an event" + event)

        let recipient_id = event.sender.id
        exports.recipient_id = recipient_id

        if (event.postback) {
            let postback = event.postback.payload
            switch (postback) {

                case "getStarted":
                    api.getUserInsights(api.receivedUserInsights);
                break;

                case "startChat":
                    api.sendTextMessage(recipient_id, "Let's start a chat");
                break;

                case "help":
                    api.sendTextMessage(recipient_id, "You want help huh?");
                break;

                default:
                    api.sendTextMessage(recipient_id, "A postback without understandance");
            }
            continue
        }

        if (event.message.quick_replies.payload) {

            let payload = JSON.parse(event.message.quick_replies.payload)

            switch (payload.method) {

                case "pickedGender":

                    api.looking_for = payload.data;

                    const results = [];
                    pg.defaults.ssl = true;
                    pg.connect(process.env.DATABASE_URL, (err, client, done) => {
                        console.log("klaar!");
                        if(err) {
                            done();
                            console.log(err);
                        }

                        const query = client.query(`UPDATE users SET looking_for=${api.looking_for} WHERE fb_id=${recipient_id}`);
                        query.on('row', (row) => {
                            results.push(row);
                            console.log(row);
                        });

                        query.on('end', () => {
                            done();
                        });
                    });

                    let call = data.confirmGender
                    api.sendClusterTextMessage(call, recipient_id, function() {
                        console.log('done');
                    })

                break;

                case "showPrivacySettings":

                    if (payload.data == false) {

                    } else if (payload.data == true) {

                    }

                break;

                default:
                    console.log('default')
            }

        }
    }
    res.sendStatus(200)
})

// spin spin sugar
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})