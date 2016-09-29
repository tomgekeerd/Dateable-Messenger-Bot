var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();
const Botly = require("botly");
const botly = new Botly({
    accessToken: pageAccessToken, //page access token provided by facebook
    verifyToken: verificationToken, //needed when using express - the verification token you provided when defining the webhook in facebook
    webHookPath: yourWebHookPath, //defaults to "/",
    notificationType: Botly.CONST.REGULAR //already the default (optional),
});

botly.on("message", (senderId, message, data) => {
    let text = `echo: ${data.text}`;

    botly.sendText({
      id: senderId,
      text: text
    });
});

const app = express();
app.use("/webhook", botly.router());
app.listen(3000);