'use strict'

const api = require('./api.js');
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
    for (let i = 0; i < messaging_events.length; i++) {

        let event = req.body.entry[0].messaging[i]
        console.log(event.message)

        let recipient_id = event.sender.id
        exports.recipient_id = recipient_id

        if ('postback' in event) {
            let postback = JSON.parse(event.postback.payload)
            switch (postback.method) {

                case "getStarted":
                    api.getUserInsights(api.receivedUserInsights);
                break;

                case "startChat":

                break;

                case "help":
                    api.sendTextMessage(recipient_id, "You want help huh?");
                break;

                case "showPrivacySettings":

                    if (postback.data == true) {
                        // TODO
                    } else {

                        let call = data.suggestStartChat
                        api.sendClusterTextMessage(call, recipient_id, function() {
                            console.log("Done")
                        })
                    }

                break;

                default:
                    api.sendTextMessage(recipient_id, "A postback without understandance");
            }
            continue

        } else if ('quick_reply' in event.message && 'payload' in event.message.quick_reply) {

            let payload = JSON.parse(event.message.quick_reply.payload)

            switch (payload.method) {

                case "pickedGender":

                    api.looking_for = payload.data;
                    let call = data.confirmGender

                    pg.defaults.ssl = true;
                    pg.connect(process.env.DATABASE_URL, (err, client, done) => {
                        if(err) {
                            done();
                            console.log(err);
                        }

                        client.query(`UPDATE users SET looking_for=${api.looking_for} WHERE fb_id=${recipient_id};`);
            
                    });
                    
                    api.sendClusterTextMessage(call, recipient_id, function() {
                        console.log('done');
                    })

                break;

                default:
                    console.log('default')
            }

        } else if ('attachments' in event.message && 'payload' in event.message.attachments) {

            let payload = JSON.parse(event.message.attachments[0].payload)

            api.loc_latitude = payload.coordinates.lat
            api.loc_longitude = payload.coordinates.long

            pg.defaults.ssl = true;
            pg.connect(process.env.DATABASE_URL, (err, client, done) => {
                if(err) {
                    done();
                    console.log(err);
                }

                client.query(`UPDATE users SET loc_latitude=${api.loc_latitude} WHERE fb_id=${recipient_id};`);
                client.query(`UPDATE users SET loc_longitude=${api.loc_longitude} WHERE fb_id=${recipient_id};`);

                console.log('set location')

            });
        }
    }
    res.sendStatus(200)
})

// spin spin sugar
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})