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
            
            api.query(`SELECT is_in_chat FROM users WHERE fb_id=${event.sender.id};`, function(err, result) {

                for (var i = result.rows.length - 1; i >= 0; i--) {
                    var row1 = result.rows[i]

                    if (row1.is_in_chat != 0) {

                        // Alright, this msg has to be sent to the other we are in a chat with

                        api.query(`SELECT * FROM chats WHERE status='live' AND chat_id='${row1.is_in_chat}';`, function(err, result) {

                            for (var i = result.rows.length - 1; i >= 0; i--) {
                                var row = result.rows[i]
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
                                        api.stopChat(event.sender.id, row1.is_in_chat, true)
                                    }
                                } else {
                                    // text msg
                                    api.sendTextMessage(humanToSendTo, event.message.text)
                                }
                            }

                        })


                    } else {

                        if ('postback' in event) {
                            let postback = JSON.parse(event.postback.payload)
                            switch (postback.method) {

                                case "getStarted":
                                    api.getUserInsights(api.receivedUserInsights);
                                break;

                                case "rejectChat": 

                                    api.query(`SELECT * FROM chats WHERE chat_id='${postback.data}';`, function(err, result) {
                                        for (var i = result.rows.length - 1; i >= 0; i--) {
                                            var row = result.rows[i]
                                            api.query(`SELECT * FROM users WHERE fb_id=${row.initiator}`, function(err, result) {
                                                for (var i = result.rows.length - 1; i >= 0; i--) {
                                                    var initiator = result.rows[i]

                                                    api.sendGenericMessage(event.sender.id, `{ \"title\": \"You rejected a chat with ${initiator.first_name}\", \"subtitle\": \"Tap 'Start a chat' to start a new chat\"}`, function() {
                                                        
                                                    })

                                                    api.query(`SELECT * FROM users WHERE fb_id=${event.sender.id};`, function(err, result) {
                                                        for (var i = result.rows.length - 1; i >= 0; i--) {
                                                            var responder = result.rows[i]
                                                            api.sendGenericMessage(initiator.fb_id, `{ \"title\": \"Unfortunately, ${responder.first_name} is currently unavailable for a chat with you\", \"subtitle\": \"Tap 'Start a chat' to start a new chat\"}`, function() {
                                                                let call = data.suggestStartChat
                                                                api.sendClusterTextMessage(call, event.sender.id, function() {
                                                                    console.log("Done")
                                                                })
                                                            })
                                                        }
                                                    })

                                                    api.query(`DELETE FROM chats WHERE chat_id='${postback.data}';`, function(err, result) {

                                                    })
                                                }
                                            })
                                        }
                                    })

                                break;

                                case "blockChat":
                                    
                                    api.query(`SELECT * FROM chats WHERE chat_id='${postback.data}';`, function(err, result) {

                                        for (var i = result.rows.length - 1; i >= 0; i--) {
                                            var row = result.rows[i]

                                            api.query(`UPDATE users SET blocked_users = blocked_users || '{${row.initiator}}' WHERE fb_id=${row.responder};`, function(err, result) {

                                                api.query(`SELECT * FROM users WHERE fb_id=${row.initiator}`, function(err, result) {
                                                    for (var i = result.rows.length - 1; i >= 0; i--) {
                                                        var row = result.rows[i]

                                                        api.sendGenericMessage(event.sender.id, `{ \"title\": \"You blocked ${row.first_name}\", \"subtitle\": \"To unblock, please head over to the settings tab.\"}`, function() {

                                                        })

                                                        api.query(`DELETE FROM chats WHERE chat_id='${postback.data}';`)
                                                    }

                                                })

                                            })  
                                        }

                                    })

                                break;

                                case "acceptChat":

                                    api.query(`UPDATE chats SET status='live' WHERE chat_id='${postback.data}' RETURNING *;`, function(err, result) {
                                        for (var i = result.rows.length - 1; i >= 0; i--) {
                                            var row = result.rows[i]
                                        
                                            api.query(`UPDATE users SET is_in_chat=${postback.data} WHERE fb_id=${row.initiator} OR fb_id=${row.responder};`, function(err, result) {
                                            
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

                                            });
                        
                                        }
                                    });
                                      

                                break

                                case "startChat":

                                    if (postback.data == true) {
                                        api.startChat(event.sender.id);
                                    } else if (postback.data == false) {
                                        api.sendTextMessage(event.sender.id, "Alright! Just beep me up when you are ready!");
                                    } else {
                                        

                                        const cards = [];
                                        const blocked = [];
                                        var me = {};
                                        var other = {};

                                        api.query(`SELECT * FROM users WHERE fb_id=${postback.data} OR fb_id=${event.sender.id};`, function(err, result) {

                                            for (var i = result.rows.length - 1; i >= 0; i--) {
                                                var row = result.rows[i]
                                            
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
                                            }


                                            api.userEligableForChat(postback.data, event.sender.id, function(eligable, id) {
                                                if (eligable) {
                                                    if (blocked.indexOf(me.fb_id) == -1) {
                                                        api.sendGenericMessage(postback.data, `{ \"title\": \"Hey it seems you got some attention, would you like to chat with ${me.first_name}?\", \"subtitle\": \"Tap chat to accept, reject to reject this person and block if he/she is harassing you.\"}`, function(error) {
                                                            if (error) {
                                                                api.sendGenericMessage(event.sender.id, `{ \"title\": \"It seems I got some trouble connecting you two.\", \"subtitle\": \"Please try again later.\"}`, function() {

                                                                })
                                                            } else {
                                                                api.getPrivacyCardOfUser(event.sender.id, me.fb_id, true, me, function(card) {
                                                                    let methodAndData = JSON.parse(card.buttons[0].payload)
                                                                    api.query(`INSERT INTO chats (chat_id, status, initiator, responder, last_response) VALUES ('${methodAndData.data}', 'pending', '${event.sender.id}', '${postback.data}', '${Math.floor(Date.now() / 1000)}')`, function(err, result) {
                                                                        cards.push(card)
                                                                        api.sendGenericMessage(postback.data, cards)
                                                                        api.sendGenericMessage(event.sender.id, `{ \"title\": \"I just asked ${other.first_name} for a chat with you. Hang on, you'll get a message when you guys are ready to talk\", \"subtitle\": \"Your chat partner has 15 min. to respond.\"}`, function() {

                                                                        })
                                                                    });
                                                                })
                                                            }
                                                        })
                                                    } else {
                                                        if (id == 1) {
                                                            api.sendGenericMessage(event.sender.id, `{ \"title\": \"It seems I got some trouble connecting you two.\", \"subtitle\": \"Please try again later.\"}`, function() {

                                                            })
                                                        } else {
                                                            api.sendGenericMessage(event.sender.id, `{ \"title\": \"You still have one chat continuing/pending.\", \"subtitle\": \"Please cancel your other chat by pressing the like.\"}`, function() {

                                                            })
                                                        }
                                                    }
                                                } else {
                                                    api.sendGenericMessage(event.sender.id, `{ \"title\": \"You still have one chat continuing/pending.\", \"subtitle\": \"Please cancel your other chat by pressing the like button.\"}`, function() {

                                                    })
                                                }
                                            })

                                        });
                                    
                                    }

                                break;

                                case "help":
                                    api.sendTextMessage(event.sender.id, "You want help huh?");
                                break;

                                case "showPrivacySettings":
                                    if (postback.data == true) {
                                      
                                        api.query(`SELECT * FROM privacy_settings WHERE fb_id=${event.sender.id};`, function(err, result) {
                                            for (var i = result.rows.length - 1; i >= 0; i--) {
                                                var row = result.rows[i]

                                                var pri_array = data.privacySettingsMessages
                                                var pri_array_buttons = data.privacySettingsMessages
                                                var card_array = [];
                                                for (var i = pri_array.length - 1; i >= 0; i--) {
                                                    console.log(pri_array.length)
                                                    var card = {
                                                        "title": pri_array[i].name,
                                                        "subtitle": "",
                                                        "buttons": []
                                                    }

                                                    if (pri_array[i].name == "Profile picture") {
                                                        card.subtitle = pri_array[i][row.profile_picture]
                                                        card.buttons = pri_array_buttons[i][row.profile_picture]
                                                    } else if (pri_array[i].name == "Fullname") {
                                                        card.subtitle = pri_array[i][row.full_name]
                                                        card.buttons = pri_array_buttons[i][row.full_name]
                                                    } else if (pri_array[i].name == "Age") {
                                                        card.subtitle = pri_array[i][row.age]
                                                        card.buttons = pri_array_buttons[i][row.age]
                                                    } else if (pri_array[i].name == "Location") {
                                                        card.subtitle = pri_array[i][row.location]
                                                        card.buttons = pri_array_buttons[i][row.location]
                                                    }

                                                    card_array.push(card)
                                                }

                                                api.sendGenericMessage(event.sender.id, card_array, function() {
                                                    console.log("done")
                                                })

                                            }
                                        })
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

                                    api.query(`UPDATE users SET looking_for=${api.looking_for} WHERE fb_id=${event.sender.id};`)

                    
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

                                    api.query(`UPDATE users SET loc_latitude=${api.loc_latitude}, loc_longitude=${api.loc_longitude}, geo_location='${api.geo_location}', search_area='${json[0].administrativeLevels.level1short}' WHERE fb_id=${event.sender.id};`);

                                    let call = data.confirmLocation
                                    api.sendClusterTextMessage(call, event.sender.id, function() {
                                        console.log('done');
                                    })

                                });
                            } else if (event.message.attachments[0].type == 'image') {
                                if (event.message.attachments[0].payload.sticker_id == 369239263222822) {
                                    api.stopChat(event.sender.id, "", false)
                                    console.log("hey")
                                }

                            } else if (event.message.attachments[0].type == 'audio') {

                            }
                        } 
                    }
                }
            });

        }
    }
    res.sendStatus(200)
})

// spin spin sugar
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})