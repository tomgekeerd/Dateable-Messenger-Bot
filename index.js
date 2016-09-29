var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();
const Botly = require("botly");
const botly = new Botly({
    accessToken: "EAAK1Sb4ieBIBAGZAmCKbjnbt49QklEmYXQsdwNc0O6Wg6ZCQTjpuv4wY8X1EhaVTXOHXT0dnVuvlGLzlkrzZCnJipzYZBAZCKZCgrixARLyhdyo6Dq50jVuvQO2jg0JkvtiGRoA0rYldfJPGet5kBBYfAbHB0fM44sYhk7Umj01gZDZD", //page access token provided by facebook
    verifyToken: "toeken133", //needed when using express - the verification token you provided when defining the webhook in facebook
    webHookPath: "/webhook", //defaults to "/",
    notificationType: Botly.CONST.REGULAR //already the default (optional),
});

botly.on("message", (senderId, message, data) => {
    let text = "echo: ${data.text}";

    botly.sendText({
      id: senderId,
      text: text
    });
});

const app = express();
app.use("/webhook", botly.router());
app.listen(3000);