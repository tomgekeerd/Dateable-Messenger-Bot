'use strict'

const request = require('request')
const index = require('./index.js')
const data = require('./data.json');
var pg = require('pg');

// Variables

var firstname = "";
exports.firstname = firstname

var lastname = "";
exports.lastname = lastname

var locale = "";
exports.locale = locale

var gender = "";
exports.gender = gender

var profile_pic = "";
exports.profile_pic = profile_pic

var timezone = "";
exports.timezone = timezone

const token = "EAAK1Sb4ieBIBAFCtI79pGWHzDfZCgBZAu6XOlcp6atKCKGVzFYoZBr0x1FACMpxK8BrZCdq2Dl6qbeUOgUTHqNyP73Am4HwVxLtPNS5SLxNw5ostvg1nyX7zAL9HHpDRzGoEyLtwjYZAjWSCPZAlsxhbPyhxiNYVgDlWPCyr6IuwZDZD"

var self = module.exports = {

    sendTextMessage: function(sender, text, q_replies, callback) {

        let messageData = {
            text: text
        }

        if (q_replies != "") {
            messageData.quick_replies = q_replies
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
            } else if (!error) {
                if (typeof callback !== 'undefined' && callback !== null){
                    callback()
                }
            }
        })
    },

    sendGreetingMessages: function(sender, name) {
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
                recipient: {id:sender},
                message: messageData,
            }
        }, function(error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else {
                var i = 0
                var getStartedMessages = function() {
                    if (i < data.getStarted.messages.length) {
                        switch (data.getStarted.method) {
                            case "send":
                                if (data.getStarted.q_reply[i] != "") {
                                    self.sendTextMessage(sender, data.getStarted.messages[i], data.getStarted.q_reply[i], function() {
                                        getStartedMessages()
                                    })
                                } else {
                                    self.sendTextMessage(sender, data.getStarted.messages[i], "", function() {
                                        getStartedMessages()
                                    })
                                }
                            break

                            case "random":

                            break

                            case "pick-one":

                            break

                            default:
                                console.log(data.getStarted.messages[i])
                        }
                        i++
                    }
                }
                getStartedMessages();
            }
        })
    },

    sendGenericMessage: function(sender) {
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
    },

    getUserInsights: function(sender, callback) {
        var returnable = "";
        request({
            url: 'https://graph.facebook.com/v2.6/' + sender + '?fields=first_name,last_name,profile_pic,locale,timezone,gender',
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
        gender = data.gender

        // Send a greeting message

        self.sendGreetingMessages(index.sender, firstname)

        pg.defaults.ssl = true;
        pg.connect(process.env.DATABASE_URL, function(err, client) {
            if (err) throw err;
            client
                .query(
                    'SELECT COUNT(*) FROM users WHERE fb_id =' sender ';
                    ')
                .on('row', function(row) {
                    console.log(JSON.stringify(row));
                });
        });
    }

}