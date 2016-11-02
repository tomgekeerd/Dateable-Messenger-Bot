'use strict'

const api = require('./api.js');
const express = require('express')
const bodyParser = require('body-parser')
const data = require('./data.json')
var pg = require('pg');
const app = express()
var NodeGeocoder = require('node-geocoder');

// Variables

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

        console.log(event.postback)

        if ('postback' in event && 'payload' in event.postback && JSON.stringify(event.postback).indexOf("getStarted") > -1) {
            let postback = JSON.parse(event.postback.payload)
            if (postback.method == 'getStarted') {
                api.getUserInsights(event.sender.id, api.receivedUserInsights);
            }
        } else {
            pg.defaults.ssl = true;
            pg.connect(process.env.DATABASE_URL, (err, client, done) => {

                if(err) {
                    done();
                    console.log(err);
                }
                console.log(event.sender.id)

                const chatQuery = client.query(`SELECT is_in_chat FROM users WHERE fb_id=${event.sender.id};`);
                chatQuery.on('row', function(chat_row) {
                    if (chat_row.is_in_chat != 0) {
                        // Alright, this msg has to be sent to the other we are in a chat with

                        const sendMSG = client.query(`SELECT * FROM chats WHERE status='live' AND chat_id='${chat_row.is_in_chat}';`);
                        sendMSG.on('row', function(row) {

                            let humanToSendTo = -1;
                            if (row.initiator == event.sender.id) {
                                humanToSendTo = row.responder;
                            } else if (row.responder == event.sender.id) {
                                humanToSendTo = row.initiator;
                            }

                            if ('message' in event && 'attachments' in event.message && 'payload' in event.message.attachments[0] || 'postback' in event) {
                                // interactive msg
                                if (event.message.attachments[0].type == 'location') {
                                    api.sendTextMessage(humanToSendTo, "", "", "", "", event.message.attachments[0].payload.url)
                                } else if (event.message.attachments[0].type == 'image' && (event.message.attachments[0].payload.sticker_id == 'undefined' || event.message.attachments[0].payload.sticker_id == null)) {
                                    api.sendTextMessage(humanToSendTo, "", "", "", event.message.attachments[0].payload.url)
                                } else if (event.message.attachments[0].type == 'audio') {
                                    api.sendTextMessage(humanToSendTo, "", "", "", "", "", event.message.attachments[0].payload.url)
                                } else if (event.message.attachments[0].type == 'file') {
                                    api.sendTextMessage(humanToSendTo, "", "", "", "", "", "", "", event.message.attachments[0].payload.url)
                                } else if (event.message.attachments[0].type == 'video') {
                                    api.sendTextMessage(humanToSendTo, "", "", "", "", "", "", event.message.attachments[0].payload.url)
                                } else if (event.message.attachments[0].type == 'image' && event.message.attachments[0].payload.sticker_id == 369239263222822) {
                                    api.stopChat(event.sender.id, chat_row.is_in_chat)
                                }
                            } else {
                                // text msg
                                api.sendTextMessage(humanToSendTo, event.message.text)
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

                                case "rejectChat": 

                                break;

                                case "blockChat":

                                    pg.defaults.ssl = true;
                                    pg.connect(process.env.DATABASE_URL, (err, client, done) => {

                                        if(err) {
                                            done();
                                            console.log(err);
                                        }

                                        const getDetails = client.query(`SELECT * FROM chats WHERE chat_id='${postback.data}';`)
                                        getDetails.on('row', function(row) {

                                            const checkQuery = client.query(`UPDATE users SET blocked_users = blocked_users || '{${row.initiator}}' WHERE fb_id=${row.responder};`)
                                            checkQuery.on('end', () => {
                                                
                                                const userDetails = client.query(`SELECT * FROM users WHERE fb_id=${row.initiator}`)
                                                userDetails.on('row', function(row) {

                                                    api.sendGenericMessage(event.sender.id, `{ \"title\": \"You blocked ${row.first_name}\", \"subtitle\": \"To unblock, please head over to the settings tab.\"}`, function() {

                                                    })

                                                })

                                            })

                                        })

                                    })

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
                                                    api.sendGenericMessage(event.sender.id, `{ \"title\": \"${call.messages[0]}\", \"subtitle\": \"${call.sub_msg[0]}\"}`, function() {
                                                        if (row.initiator == event.sender.id) {
                                                            api.sendGenericMessage(row.responder, `{ \"title\": \"${data.chatIsAccepted.messages[0]}\", \"subtitle\": \"${data.chatIsAccepted.sub_msg[0]}\"}`, function() {

                                                            })
                                                        } else {
                                                            api.sendGenericMessage(row.initiator, `{ \"title\": \"${data.chatIsAccepted.messages[0]}\", \"subtitle\": \"${data.chatIsAccepted.sub_msg[0]}\"}`, function() {

                                                            })
                                                        }
                                                    })                        
                                                })
                                            })
                                    
                                    })

                                break

                                case "startChat":

                                    if (postback.data == true) {
                                        api.startChat(event.sender.id);
                                    } else if (postback.data == false) {
                                        api.sendTextMessage(event.sender.id, "Alright! Just beep me up when you are ready!");
                                    } else {
                                        pg.defaults.ssl = true;
                                        pg.connect(process.env.DATABASE_URL, (err, client, done) => {

                                            if(err) {
                                                done();
                                                console.log(err);
                                            }

                                            const cards = [];
                                            const blocked = [];
                                            var me = {};
                                            var other = {};

                                            const dataQuery = client.query(`SELECT * FROM users WHERE fb_id=${postback.data} OR fb_id=${event.sender.id};`);
                                            dataQuery.on('row', function(row) {
                                                if (row.fb_id == event.sender.id) {
                                                    me = row
                                                } else if (row.fb_id == postback.data) {
                                                    other = row
                                                    if (row.blocked_users != null) {
                                                        for (var i = row.blocked_users.length - 1; i >= 0; i--) {
                                                            blocked.push(row.blocked_users[i])
                                                        }
                                                    }
                                                }
                                            })

                                            dataQuery.on('end', () => {
                                                done();
                                
                                                if (blocked.indexOf(me.fb_id) == -1) {
                                                    api.sendGenericMessage(postback.data, `{ \"title\": \"Hey it seems you got some attention, would you like to chat with ${me.first_name}?\", \"subtitle\": \"Tap chat to accept, reject to reject this person and block if he/she is harassing you.\"}`, function(error) {
                                                        if (error) {
                                                            api.sendGenericMessage(event.sender.id, `{ \"title\": \"It seems I got some trouble connecting you two.\", \"subtitle\": \"Please try again later.\"}`, function() {

                                                            })
                                                        } else {
                                                            api.getPrivacyCardOfUser(event.sender.id, me.fb_id, true, me, function(card) {
                                                                let methodAndData = JSON.parse(card.buttons[0].payload)
                                                                const addQuery = client.query(`INSERT INTO chats (chat_id, status, initiator, responder, last_response) VALUES ('${methodAndData.data}', 'pending', '${event.sender.id}', '${postback.data}', '${Math.floor(Date.now() / 1000)}')`);
                                                                addQuery.on('end', () => {
                                                                    cards.push(card)
                                                                    api.sendGenericMessage(postback.data, cards)
                                                                    api.sendTextMessage(event.sender.id, "I just asked " + other.first_name + " for a chat with you. Hang on, you'll get a message when you guys are ready to talk.");
                                                                })
                                                            })
                                                        }
                                                    })
                                                } else {
                                                    api.sendGenericMessage(event.sender.id, `{ \"title\": \"It seems I got some trouble connecting you two.\", \"subtitle\": \"Please try again later.\"}`, function() {

                                                    })
                                                }
                                            })
                                        })

                                    }

                                break;

                                case "help":
                                    api.sendTextMessage(event.sender.id, "You want help huh?");
                                break;

                                case "showPrivacySettings":
                                    if (postback.data == true) {
                                        // TODO
                                    } else {

                                        let call = data.suggestStartChat
                                        api.sendClusterTextMessage(call, event.sender.id, function() {
                                            console.log("Done")
                                        })
                                    }

                                break;

                                default:
                                    api.sendTextMessage(event.sender.id, "A postback without understandance");
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

                                        const query = client.query(`UPDATE users SET looking_for=${api.looking_for} WHERE fb_id=${event.sender.id};`);
                                        query.on('end', () => {
                                            done();
                                        });
                                    });
                                    
                                    api.sendClusterTextMessage(call, event.sender.id, function() {
                                        console.log('done');
                                    })

                                break;

                                default:
                                    console.log('default')
                            }

                        } else if ('attachments' in event.message && 'payload' in event.message.attachments[0]) {

                            if (event.message.attachments[0].type == 'location') {

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

                                        client.query(`UPDATE users SET loc_latitude=${api.loc_latitude}, loc_longitude=${api.loc_longitude}, geo_location='${api.geo_location}', search_area='${json[0].administrativeLevels.level1short}' WHERE fb_id=${event.sender.id};`);

                                        let call = data.confirmLocation
                                        api.sendClusterTextMessage(call, event.sender.id, function() {
                                            console.log('done');
                                        })
                                    });
                                });
                            } else if (event.message.attachments[0].type == 'image') {

                            } else if (event.message.attachments[0].type == 'audio') {

                            }
                        } 
                    }
                })
                chatQuery.on('end', () => {
                    done();
                })
            })
        }
    }
    res.sendStatus(200)
})

// spin spin sugar
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})