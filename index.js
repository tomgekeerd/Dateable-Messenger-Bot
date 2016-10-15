'use strict'

const api = require('./api.js');
const express = require('express')
const bodyParser = require('body-parser')
const data = require('./data.json')
var pg = require('pg');
const app = express()
var NodeGeocoder = require('node-geocoder');

// Variables

var recipient_id = -1;

var options = {
  provider: 'google',
 
  // Optional depending on the providers 
  httpAdapter: 'https', // Default 
  apiKey: 'AIzaSyBkUEl7Sxsl4z5TKbMsjnEgUDKzUSESwk0', // for Mapquest, OpenCage, Google Premier 
  formatter: null         // 'gpx', 'string', ... 
};

var geocoder = NodeGeocoder(options);

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
        console.log(event)

        let recipient_id = -1;

        if (recipient_id == -1) {
            recipient_id = event.sender.id
            exports.recipient_id = recipient_id
        }

        pg.defaults.ssl = true;
        pg.connect(process.env.DATABASE_URL, (err, client, done) => {

            if(err) {
                done();
                console.log(err);
            }
            console.log(recipient_id)
            const chatQuery = client.query(`SELECT is_in_chat FROM users WHERE fb_id=${recipient_id};`);
            chatQuery.on('row', function(row) {
                if (row.is_in_chat != 0) {
                    // Alright, this msg has to be sent to the other we are in a chat with
                    const sendMSG = client.query(`SELECT * FROM chats WHERE status='live' AND chat_id='${row.is_in_chat}';`);
                    sendMSG.on('row', function(row) {
                        if (row.initiator == recipient_id) {
                            api.sendTextMessage(row.responder, event.message.text)
                        } else if (row.responder == recipient_id) {
                            api.sendTextMessage(row.initiator, event.message.text)
                        }
                    })

                    sendMSG.on('end', () => {
                        done();
                    })
                } else {

                    if ('postback' in event) {
                        let postback = JSON.parse(event.postback.payload)
                        switch (postback.method) {

                            case "getStarted":
                                api.getUserInsights(api.receivedUserInsights);
                            break;

                            case "acceptChat":

                                pg.defaults.ssl = true;
                                pg.connect(process.env.DATABASE_URL, (err, client, done) => {

                                    if(err) {
                                        done();
                                        console.log(err);
                                    }

                                    const chatQuery = client.query(`UPDATE chats SET status='live' WHERE chat_id='${postback.data}' RETURNING *;`);
                                    chatQuery.on('row', function(row) {
                                        const usersQuery = client.query(`UPDATE users SET is_in_chat=${postback.data} WHERE fb_id=${row.initiator} OR fb_id=${row.responder};`);
                                        usersQuery.on('end', () => {
                                            let call = data.acceptedAChat
                                            api.sendClusterTextMessage(call, recipient_id, function() {
                                                console.log('done');
                                            })                        
                                        })
                                    })
                                })

                            break

                            case "startChat":

                                if (postback.data == true) {
                                    api.startChat();
                                } else if (postback.data == false) {
                                    api.sendTextMessage(recipient_id, "Alright! Just beep me up when you are ready!");
                                } else {
                                    pg.defaults.ssl = true;
                                    pg.connect(process.env.DATABASE_URL, (err, client, done) => {

                                        if(err) {
                                            done();
                                            console.log(err);
                                        }

                                        const cards = [];
                                        var me = {};
                                        var other = {};

                                        const dataQuery = client.query(`SELECT * FROM users WHERE fb_id=${postback.data} OR fb_id=${recipient_id};`);
                                        dataQuery.on('row', function(row) {
                                            if (row.fb_id == recipient_id) {
                                                me = row
                                            } else if (row.fb_id == postback.data) {
                                                other = row
                                            }
                                        })

                                        dataQuery.on('end', () => {
                                            done();

                                            api.sendTextMessage(postback.data, "Hey it seems you got some attention, would you like to chat with " + me.first_name + "?", "", "", function() {
                                                api.getPrivacyCardOfUser(me.fb_id, true, me, function(card) {
                                                    let methodAndData = JSON.parse(card.buttons[0].payload)
                                                    const addQuery = client.query(`INSERT INTO chats (chat_id, status, initiator, responder, last_response) VALUES ('${methodAndData.data}', 'pending', '${recipient_id}', '${postback.data}', '${Math.floor(Date.now() / 1000)}')`);
                                                    addQuery.on('end', () => {
                                                        cards.push(card)
                                                        api.sendGenericMessage(postback.data, cards)
                                                        api.sendTextMessage(recipient_id, "I just asked " + other.first_name + " for a chat with you. Hang on, you'll get a message when you guys are ready to talk.");
                                                    })
                                                })
                                            })
                                        })
                                    })

                                }

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

                                    const query = client.query(`UPDATE users SET looking_for=${api.looking_for} WHERE fb_id=${recipient_id};`);
                                    query.on('end', () => {
                                        done();
                                    });
                                });
                                
                                api.sendClusterTextMessage(call, recipient_id, function() {
                                    console.log('done');
                                })

                            break;

                            default:
                                console.log('default')
                        }

                    } else if ('attachments' in event.message && 'payload' in event.message.attachments[0] && 'coordinates' in event.message.attachments[0].payload && 'lat' in event.message.attachments[0].payload.coordinates) {

                        let payload = event.message.attachments[0].payload

                        api.loc_latitude = payload.coordinates.lat
                        api.loc_longitude = payload.coordinates.long

                        // Get geo details

                        geocoder.reverse({lat:api.loc_latitude, lon:api.loc_longitude}, function(err, res) {

                            // JSON validations

                            let strings = JSON.stringify(res)
                            let json = JSON.parse(strings)

                            api.geo_location = json[0].city + ", " + json[0].administrativeLevels.level1short + ", " + json[0].country;

                            // UPDATE in db

                            pg.defaults.ssl = true;
                            pg.connect(process.env.DATABASE_URL, (err, client, done) => {
                                if(err) {
                                    console.log(err);
                                    done();
                                }

                                client.query(`UPDATE users SET loc_latitude=${api.loc_latitude}, loc_longitude=${api.loc_longitude}, geo_location='${api.geo_location}', search_area='${json[0].administrativeLevels.level1short}' WHERE fb_id=${recipient_id};`);

                                let call = data.confirmLocation
                                api.sendClusterTextMessage(call, recipient_id, function() {
                                    console.log('done');
                                })
                            });
                        });
                    }
                }
            })

            chatQuery.on('end', () => {
                done();
            })
        })
    }
    res.sendStatus(200)
})

// spin spin sugar
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})