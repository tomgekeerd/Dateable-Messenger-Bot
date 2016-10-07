'use strict'

const request = require('request');
const data = require('./data.json');
var pg = require('pg');
var webhook = require('./index.js');

// Variables

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
exports.looking_for = -1;

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

        console.log(messageData)

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


    },

    sendGreetingMessages: function(recipient, name) {
        let messageData = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Welcome to this bot, " + name + "!",
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
                console.log('like wtf')
                let call = data.getStarted
                self.sendClusterTextMessage(call, webhook.recipient_id, function() {
                    console.log('done');
                })
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

        switch(data.gender.lower) {
            case 'male':
                gender = 0
            break

            case 'female':
                gender = 1
            break

            default:
                gender = 2
        }

        // Send a greeting message

        self.sendGreetingMessages(webhook.recipient_id, firstname)

        const results = [];

        pg.defaults.ssl = true;
        pg.connect(process.env.DATABASE_URL, (err, client, done) => {
            if(err) {
                done();
                console.log(err);
            }

            const query = client.query(`INSERT INTO users (last_name, first_name, gender, looking_for, profile_pic, fb_id) VALUES ('${lastname}', '${firstname}', ${gender}, -1, '${profile_pic}', ${webhook.recipient_id});`);
            query.on('row', (row) => {
                results.push(row);
            });

            query.on('end', () => {
                done();
            });
        });

    }

}