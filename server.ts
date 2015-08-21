/// <reference path="typings/tsd.d.ts" />
import express = require('express');
import mongoose = require('mongoose');

import path = require('path');

import fs = require('fs');



import indexRoute = require('./routes/index');
import userController = require('./controllers/userController');
//var githubOauthController = require('./controllers/oauthController'));

// TODO: make configurable
var HTTP_PORT = 3123;
var HTTPS_PORT = HTTP_PORT + 1
var baseUrl = "https://localhost:" + HTTPS_PORT;

// The controller is currently a singleton.
// TODO: allow multiple instances using module.exports = function(){...}
// https://stackoverflow.com/questions/28833808/how-to-get-multiple-instances-of-module-in-node-js

var githubConfig = {
    baseUrl: baseUrl,
    basePath: "/auth/github",
    clientID: 'f117ca3a3a913dab3698',
    clientSecret: '1c36a181dc91dacf275b0f1fc8b6fdb65ed92ec9',
    scope: 'notifications',
    oauthSite: "https://github.com/login",
    oauthTokenPath: '/oauth/access_token',
    oauthAuthorizationPath: '/oauth/authorize',
};

var githubOauthController = require('./controllers/oauthController')(githubConfig);

var bitReserveConfig = {
    baseUrl: baseUrl,
    basePath: "/auth/bitreserve",
    clientID: 'e75aef1e3bfc8f6f49fcf4f1ebf0bbf30dd8988c',
    clientSecret: 'b3df38816602d936c304774c43420d56eda8358f',

    scope: "cards:read,cards:write,transactions:read,transactions:write,user:read",
    // BitReserve uses a different domain for the authorization URL. simple-oauth2 doesn't support that.
    // The "site" parameter also may not be empty.
    // As a workaround, we use the greatest common denominator of the two URLs: "https://".
    oauthSite: "https://",
    oauthTokenPath: 'api.bitreserve.org/oauth2/token',
    oauthAuthorizationPath: 'bitreserve.org/authorize/' + 'e75aef1e3bfc8f6f49fcf4f1ebf0bbf30dd8988c',
}

var bitReserveOauthController = require('./controllers/oauthController')(bitReserveConfig);

var app = express();

// TODO: store in config file.
var db = mongoose.connect("mongodb://moneycircles-bitreserve-poc-dev-user:iPBNE0ZeQRPbsHOVWEUi@ds035593.mongolab.com:35593/moneycircles-bitreserve-poc-dev");

app.use(express.static(__dirname + '/views'));

app.get('/', indexRoute.index);

//app.get('/users', userController.list);
app.get('/users/:name', userController.retrieveUser);
app.post('/users/:name', userController.createUser);

app.get(githubOauthController.getAuthRoute(), githubOauthController.auth);
app.get(githubOauthController.getCallbackRoute(), githubOauthController.callback);

app.get(bitReserveOauthController.getAuthRoute(), bitReserveOauthController.auth);
app.get(bitReserveOauthController.getCallbackRoute(), bitReserveOauthController.callback);

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