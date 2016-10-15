'use strict'

const request = require('request');
const data = require('./data.json');
var pg = require('pg');
var webhook = require('./index.js');

// Variables

var maxDistance = 25.0;
 
var firstname = "";
exports.firstname = firstname

var lastname = "";
exports.lastname = lastname

var locale = "";
exports.locale = locale

var gender = -1;
exports.gender = gender

var profile_pic = "";
exports.profile_pic = profile_pic

var timezone = "";
exports.timezone = timezone

var looking_for = -1;
exports.looking_for = looking_for;

var loc_latitude = -1;
exports.loc_latitude = loc_latitude;

var loc_longitude = -1;
exports.loc_longitude = loc_longitude;

var geo_location = "";
exports.geo_location = geo_location;

var search_area = "";
exports.search_area = search_area;

const token = "EAAK1Sb4ieBIBAFCtI79pGWHzDfZCgBZAu6XOlcp6atKCKGVzFYoZBr0x1FACMpxK8BrZCdq2Dl6qbeUOgUTHqNyP73Am4HwVxLtPNS5SLxNw5ostvg1nyX7zAL9HHpDRzGoEyLtwjYZAjWSCPZAlsxhbPyhxiNYVgDlWPCyr6IuwZDZD"

var self = module.exports = {

    sendTextMessage: function(recipient, text, q_replies, buttons, image, location, audio, video, file, callback) {

        let messageData = {
            text: text
        }

        var iTemplate = data.interactiveTemplate
        console.log(iTemplate)

        if (q_replies != "") {
            messageData.quick_replies = q_replies
        } else if (buttons != "") {
            messageData = {}
            let button = data.buttonTemplate
            button.payload.text = text
            button.payload.buttons = buttons
            messageData.attachment = button
        } else if (image != "") {
            messageData = {}
            iTemplate.type = "image"
            iTemplate.payload.url = image
            console.log('baby come on' + image)
        } else if (location != "") {
            console.log(location)
        } else if (audio != "") {
            messageData = {}
            iTemplate.type = "audio"
            iTemplate.payload.url = audio
        } else if (video != "") {
            messageData = {}
            iTemplate.type = "video"
            iTemplate.payload.url = video
        } else if (file != "") {
            messageData = {}
            iTemplate.type = "file"
            iTemplate.payload.url = file
        }

        if (iTemplate != data.interactiveTemplate) {
            messageData.attachment = iTemplate
        }

        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token:token},
            method: 'POST',
            json: {
                recipient: {id:recipient},
                message: messageData,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else if (response.body.error) {
                console.log('Error: ', response.body.error)
            } else if (!error) {
                if (typeof callback !== 'undefined' && callback !== null){
                    callback()
                }
            }
        })
    },

    sendClusterTextMessage: function(call, recipient, callback) {

        var i = 0
        console.log('wauw')
        var sendMessages = function() {
            if (i < call.messages.length) {
                switch (call.method) {
                    case "send":
                        if (call.q_reply && call.q_reply[i] != "") {
                            self.sendTextMessage(recipient, call.messages[i], call.q_reply[i], "", "", "", "", "", "", function() {
                                sendMessages()
                            })
                        } else if (call.buttons && call.buttons[i] != "") {
                            self.sendTextMessage(recipient, call.messages[i], "", call.buttons[i], "", "", "", "", "", function() {
                                sendMessages()
                            })
                        } else {
                            self.sendTextMessage(recipient, call.messages[i], "", "", "", "", "", "", "", function() {
                                sendMessages()
                            })
                        }
                    break

                    case "random":

                    break

                    case "pick-one":

                    break

                    default:
                        console.log(method.messages[i])
                }
                i++
            } else {
                callback();
            }
        }
        sendMessages();

    },

    startChat: function() {

        pg.defaults.ssl = true;
        pg.connect(process.env.DATABASE_URL, (err, client, done) => {
            if(err) {
                done();
                console.log(err);
            }

            const preferences_query = client.query(`SELECT * FROM users WHERE fb_id=${webhook.recipient_id};`)
            preferences_query.on('row', function(row) {
                var looking_for_gender = ""
                var looking_for_gender_one = ""
                switch (row.looking_for) {
                    case 0:
                        looking_for_gender = "men"
                        looking_for_gender_one = "man"
                    break

                    case 1:
                        looking_for_gender = "women"
                        looking_for_gender_one = "woman"
                    break

                    case 2:
                        looking_for_gender = "people"
                    break

                    default:
                        looking_for_gender = "noone"
                }
                self.sendTextMessage(webhook.recipient_id, "Looking for " + looking_for_gender + " in the nabourhood of " + row.geo_location + "...", "", "", "", "", "", "", "", function() {

                    self.findPeople(row.looking_for, row.gender, row.loc_latitude, row.loc_longitude, row.search_area, function(results) {

                        console.log(results);
                        var send_array = [];
                        // First, inform the user about the hits

                        if (results.length > 0) {
                            if (results.length == 1) {
                                self.sendTextMessage(webhook.recipient_id, "I found " + results.length + " " + looking_for_gender_one + " in your nabourhood. Tap 'chat' if you would like to chat with one of them.")
                            } else if (results.length > 1) {
                                self.sendTextMessage(webhook.recipient_id, "I found " + results.length + " " + looking_for_gender + " in your nabourhood. Tap 'chat' if you would like to chat with him/her")
                            }

                            for (let i = 0; i < results.length; i++) {
                                self.getPrivacyCardOfUser(results[i].fb_id, false, results[i], function(card) {
                                    send_array.push(card);
                                    if (send_array.length == results.length) {
                                        self.sendGenericMessage(webhook.recipient_id, send_array);
                                    }
                                })
                            }  
                        } else {
                            self.sendTextMessage(webhook.recipient_id, "Unfortunately, I was unable to find someone in your nabourhood following your wishes. Please try again later.")
                        }
                    });
                });
            });
        })
    },

    getPrivacyCardOfUser: function(user_id, accept, results, callback)  {

        pg.defaults.ssl = true;
        pg.connect(process.env.DATABASE_URL, (err, client, done) => {
            if(err) {
                done();
                console.log(err);
            }

            const user_info = client.query(`SELECT * FROM users WHERE fb_id=${webhook.recipient_id};`)
            user_info.on('row', function(row) {

                const privacy_settings = client.query(`SELECT * FROM privacy_settings WHERE fb_id=${user_id};`)
                privacy_settings.on('row', function(privacy_row) {

                    var name = ""
                    var location = ""
                    var image = ""

                    if (privacy_row.full_name == 0) {
                        name = results.first_name
                    } else if (privacy_row.full_name == 1) {
                        name = results.first_name + " " + results.last_name
                    }

                    if (privacy_row.location == 0) {
                        // Close, Med, Far
                        var distance = self.getDistanceFromLatLonInKm(results.loc_latitude, results.loc_longitude, row.loc_latitude, row.loc_longitude)
                        if (distance <= maxDistance / 3) {
                            location = "Near"
                        } else if (distance >= maxDistance / 3 && distance <= (maxDistance / 3) * 2) {
                            location = "Close"
                        } else if (distance > (maxDistance / 3) * 2) {
                            location = "Far"
                        }
                    } else if (privacy_row.full_name == 1) {
                        location = results.geo_location
                    }

                    if (privacy_row.profile_pic == 0) {
                        // Woman, Man
                        if (results.gender == 0) {
                            image = "http://www.marketingmasala.com/wp-content/uploads/2016/05/Join-Marketing-Masala.jpg"
                        } else if (results.gender == 1) {
                            image = "http://aucet.in/it/staffs/female.jpg"
                        }
                    } else if (privacy_row.full_name == 1) {
                        image = results.profile_pic
                    }

                    let card = {};
                    if (accept) {
                        let chat_id = self.randomInt(0, 2093891025);
                        card = {
                            "title": name,
                            "subtitle": location,
                            "image_url": image,
                            "buttons": [{
                                    "type": "postback",
                                    "title": "Chat",
                                    "payload": `{ \"method\": \"acceptChat\", \"data\": ${chat_id} }`
                                },
                                {   
                                    "type": "postback",
                                    "title": "Reject",
                                    "payload": `{ \"method\": \"rejectChat\", \"data\": ${chat_id} }`
                                },
                                {   
                                    "type": "postback",
                                    "title": "Block",
                                    "payload": `{ \"method\": \"blockChat\", \"data\": ${chat_id} }`
                                }
                            ]
                        }
                    } else {
                        card = {
                            "title": name,
                            "subtitle": location,
                            "image_url": image,
                            "buttons": [
                                {
                                    "type": "postback",
                                    "title": "Chat",
                                    "payload": `{ \"method\": \"startChat\", \"data\": ${results.fb_id} }`
                                }
                            ]
                        }
                    }
                    callback(card);
                })
            })
        })
    },

    findPeople: function(looking_for, gender, lat, long, search_area, callback) {

        var big_found_array = [];
        var small_found_array = [];

        pg.defaults.ssl = true;
        pg.connect(process.env.DATABASE_URL, (err, client, done) => {
            if(err) {
                done();
                console.log(err);
            }

            const search_query = client.query(`SELECT * FROM users WHERE gender=${looking_for} AND looking_for=${gender} AND search_area='${search_area}' AND fb_id <> ${webhook.recipient_id};`)
            search_query.on('row', function(row) {
                big_found_array.push(row);
            })

            search_query.on('end', () => {
                done();

                for (var i = big_found_array.length - 1; i >= 0; i--) {
                    if (self.getDistanceFromLatLonInKm(big_found_array[i].loc_latitude, big_found_array[i].loc_longitude, lat, long) <= maxDistance) {
                        small_found_array.push(big_found_array[i]);
                    }
                }

                // JSON Validations

                callback(small_found_array); 
            })
        })
    },

    sendGreetingMessages: function(recipient, name, first_time) {
        var titleOfMessage = "Welcome to this bot, " + name + "!";
        if (!first_time) {
            titleOfMessage = "Welcome to this bot again, " + name + "!";
        }
        let messageData = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": titleOfMessage,
                        "subtitle": "Let me explain what you can do with me.",
                        "image_url": "https://pbs.twimg.com/profile_images/664257671768354816/w2ZlpSd6.png"
                    }]
                }
            }
        }
        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token:token},
            method: 'POST',
            json: {
                recipient: {id:recipient},
                message: messageData,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else {
                if (first_time) {
                    let call = data.getStarted
                    self.sendClusterTextMessage(call, webhook.recipient_id, function() {
                        console.log('done');
                    })
                } else {
                    let call = data.getStartedRevisited
                    self.sendClusterTextMessage(call, webhook.recipient_id, function() {
                        console.log('done');
                    })
                }
            }
        })
    },

    sendGenericMessage: function(recipient, cards) {

        let messageData = {}
        let generic = data.genericTemplate
        generic.payload.elements = cards
        messageData.attachment = generic

        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token:token},
            method: 'POST',
            json: {
                recipient: {id:recipient},
                message: messageData,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else if (response.body.error) {
                console.log('Error: ', response.body.error)
            }
        })
    },

    getUserInsights: function(callback) {
        request({
            url: 'https://graph.facebook.com/v2.6/' + webhook.recipient_id + '?fields=first_name,last_name,profile_pic,locale,timezone,gender',
            qs: {access_token:token},
            method: 'GET',
            json: {

            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else {
                console.log(body)
                callback(body)
            }
        })
    },

    receivedUserInsights: function(data) {

        // Saving user data

        firstname = data.first_name
        lastname = data.last_name
        locale = data.locale
        timezone = data.timezone
        profile_pic = data.profile_pic

        switch(data.gender) {
            case 'male':
                gender = 0
            break

            case 'female':
                gender = 1
            break

            default:
                gender = 2
        }

        // Add details into db

        pg.defaults.ssl = true;
        pg.connect(process.env.DATABASE_URL, (err, client, done) => {
            if(err) {
                done();
                console.log(err);
            }

            const countQuery = client.query(`SELECT COUNT(*) FROM users WHERE fb_id = ${webhook.recipient_id};`)
            countQuery.on('row', (row) => {
                if (row.count == 0 && row.loc_longitude != -1 && row.loc_latitude != -1 && row.looking_for != -1) {

                    client.query(`INSERT INTO users (last_name, first_name, gender, looking_for, profile_pic, fb_id, loc_latitude, loc_longitude, is_in_chat) VALUES ('${lastname}', '${firstname}', ${gender}, -1, '${profile_pic}', ${webhook.recipient_id}, -1, -1, 0);`);
                    client.query(`INSERT INTO privacy_settings (fb_id, full_name, age, location, profile_pic) VALUES (${webhook.recipient_id}, 1, 1, 1, 1);`);

                    const checkUsersQuery = client.query(`SELECT COUNT(*) FROM users WHERE fb_id=${webhook.recipient_id};`)
                    checkUsersQuery.on('row', (row) => {
                        if (row.count > 0) {
                            const checkPrivacyQuery = client.query(`SELECT COUNT(*) FROM privacy_settings WHERE fb_id=${webhook.recipient_id};`)
                            checkPrivacyQuery.on('row', (row) => {
                                if (row.count > 0) {

                                    // Send greeting

                                    self.sendGreetingMessages(webhook.recipient_id, firstname, true);
                                }
                            })
                        }
                    })

                    checkUsersQuery.on('end', () => {
                        done();
                    })

                } else {

                    // Send greeting

                    self.sendGreetingMessages(webhook.recipient_id, firstname, false);
                }
            });

            countQuery.on('end', () => {
                done();
            })

        });

    },

    randomInt: function(low, high) {
        return Math.floor(Math.random() * (high - low) + low);
    },

    getDistanceFromLatLonInKm: function(lat1, lon1, lat2, lon2) {
        var R = 6371; 
        var dLat = self.deg2rad(lat2-lat1);
        var dLon = self.deg2rad(lon2-lon1); 

        var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(self.deg2rad(lat1)) * Math.cos(self.deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c; 

        return d;
    },

    deg2rad: function(deg) {
        return deg * (Math.PI/180)
    }

}