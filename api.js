'use strict'

const request = require('request');
const data = require('./data.json');
var pg = require('pg');
var webhook = require('./index.js');

// Variables

var maxDistance = 25;
 
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

    sendTextMessage: function(recipient, text, q_replies, buttons, callback) {

        let messageData = {
            text: text
        }

        if (q_replies != "") {
            messageData.quick_replies = q_replies
        } else if (buttons != "") {
            messageData = {}

            let button = data.buttonTemplate
            button.payload.text = text
            button.payload.buttons = buttons

            messageData.attachment = button
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
        var sendMessages = function() {
            if (i < call.messages.length) {
                switch (call.method) {
                    case "send":
                        if (call.q_reply && call.q_reply[i] != "") {
                            self.sendTextMessage(recipient, call.messages[i], call.q_reply[i], "", function() {
                                sendMessages()
                            })
                        } else if (call.buttons && call.buttons[i] != "") {
                            self.sendTextMessage(recipient, call.messages[i], "", call.buttons[i], function() {
                                sendMessages()
                            })
                        } else {
                            self.sendTextMessage(recipient, call.messages[i], "", "", function() {
                                sendMessages()
                            })
                        }
                    break

                    case "random":

                    break

                    case "pick-one":

                    break

                    default:
                        console.log('method.messages[i]')
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

            const preferences_query = client.query(`SELECT * FROM users WHERE fb_id = ${webhook.recipient_id};`)
            preferences_query.on('row', function(row) {
                var looking_for_gender = ""
                switch (row.looking_for) {
                    case 0:
                        looking_for_gender = "men"
                    break

                    case 1:
                        looking_for_gender = "women"
                    break

                    case 2:
                        looking_for_gender = "both gender"
                    break

                    default:
                        looking_for_gender = "noone"
                }
                self.sendTextMessage(webhook.recipient_id, "Looking for " + looking_for_gender + " in the nabourhood of " + row.geo_location + "...", "", "", function() {

                    self.findPeople(row.looking_for, row.loc_latitude, row.loc_longitude, row.search_area, function(results) {

                        var send_array = [];
                        // First, inform the user about the hits

                        if (results.length > 0) {
                            self.sendTextMessage(webhook.recipient_id, "I found " + results.length + " " + looking_for_gender + " in your nabourhood. Tap 'chat' if you would like to chat with one of them.")

                            for (var i = results.length - 1; i >= 0; i--) {
                                let card = {
                                    "title": results[i].first_name + " " + results[i].last_name,
                                    "subtitle": results[i].geo_location,
                                    "image_url": results[i].profile_pic,
                                    "buttons": [{
                                        "type": "postback",
                                        "title": "Chat",
                                        "payload": `{ \"method\": \"startChat\", \"data\": ${results[i].fb_id} }`,
                                    }]
                                }
                                send_array.push(card);
                            }
                            console.log(send_array);
                        } else {
                            self.sendTextMessage(webhook.recipient_id, "Unfortunately, I was unable to find someone in your nabourhood following your wishes. Please try again later.")
                        }

                    });

                });
            });
        })

    },

    findPeople: function(gender, lat, long, search_area, callback) {

        var big_found_array = [];
        var small_found_array = [];

        pg.defaults.ssl = true;
        pg.connect(process.env.DATABASE_URL, (err, client, done) => {
            if(err) {
                done();
                console.log(err);
            }

            const search_query = client.query(`SELECT * FROM users WHERE gender=${gender} AND search_area='${search_area}' AND fb_id <> ${webhook.recipient_id};`)
            search_query.on('row', function(row) {
                big_found_array.push(row);
            })

            search_query.on('end', () => {
                done();

                for (var i = big_found_array.length - 1; i >= 0; i--) {
                    if (self.getDistanceFromLatLonInKm(big_found_array[i].loc_latitude, big_found_array[i].loc_longitude, lat, long) <= 25.0) {
                        small_found_array.push(big_found_array[i]);
                    }
                }
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

    sendGenericMessage: function(recipient) {
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
                if (row.count == 0) {

                    client.query(`INSERT INTO users (last_name, first_name, gender, looking_for, profile_pic, fb_id, loc_latitude, loc_longitude) VALUES ('${lastname}', '${firstname}', ${gender}, -1, '${profile_pic}', ${webhook.recipient_id}, -1, -1);`);
                    client.query(`INSERT INTO privacy_settings (fb_id, full_name, fbprofile, age, location, profile_pic) VALUES (${webhook.recipient_id}, 1, 1, 1, 1, 1);`);

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

                } else if (row.count > 0) {

                    // Send greeting

                    self.sendGreetingMessages(webhook.recipient_id, firstname, false);
                }
            });

        });

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