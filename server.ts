/// <reference path="typings/tsd.d.ts" />
import express = require('express');
import mongoose = require('mongoose');

import path = require('path');

import fs = require('fs');



import indexRoute = require('./routes/index');
import userController = require('./controllers/userController');
var oauthController = require('./controllers/oauthController');
//var githubOauthController = require('./controllers/oauthController'));

// TODO: make configurable
var HTTP_PORT = 3123;
var HTTPS_PORT = HTTP_PORT + 1
var baseUrl = "https://localhost:" + HTTPS_PORT;

// The controller is currently a singleton.
// TODO: allow multiple instances using module.exports = function(){...}
// https://stackoverflow.com/questions/28833808/how-to-get-multiple-instances-of-module-in-node-js

oauthController.baseUrl = baseUrl
oauthController.basePath = "/auth/github";
oauthController.clientID = 'f117ca3a3a913dab3698';
oauthController.clientSecret = '1c36a181dc91dacf275b0f1fc8b6fdb65ed92ec9';
oauthController.scope =  'notifications';
oauthController.oauthSite = "https://github.com/login";
oauthController.oauthTokenPath = '/oauth/access_token';
oauthController.oauthAuthorizationPath = '/oauth/authorize';

//oauthController.baseUrl = baseUrl;
//oauthController.basePath = "/auth/bitreserve";
//oauthController.clientID = 'e75aef1e3bfc8f6f49fcf4f1ebf0bbf30dd8988c';
//oauthController.clientSecret = 'b3df38816602d936c304774c43420d56eda8358f';

//oauthController.scope = "cards:read,cards:write,transactions:read,transactions:write,user:read";

//oauthController.oauthSite = "https://";
//oauthController.oauthTokenPath = 'api.bitreserve.org/oauth2/token';
//oauthController.oauthAuthorizationPath = 'bitreserve.org/authorize/' + oauthController.clientID;

// Initialize the controller now we've set all options.
oauthController.init();

var app = express();

// TODO: store in config file.
var db = mongoose.connect("mongodb://moneycircles-bitreserve-poc-dev-user:iPBNE0ZeQRPbsHOVWEUi@ds035593.mongolab.com:35593/moneycircles-bitreserve-poc-dev");

app.use(express.static(__dirname + '/views'));

app.get('/', indexRoute.index);

//app.get('/users', userController.list);
app.get('/users/:name', userController.retrieveUser);
app.post('/users/:name', userController.createUser);

app.get(oauthController.getAuthRoute(), oauthController.auth);
app.get(oauthController.getCallbackRoute(), oauthController.callback);

var httpsOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

var http = require('http');
var https = require('https');

http.createServer(app).listen(HTTP_PORT);
https.createServer(httpsOptions, app).listen(HTTPS_PORT);

console.log('http server started on port ' + HTTP_PORT);
console.log('https server started on port ' + HTTPS_PORT);