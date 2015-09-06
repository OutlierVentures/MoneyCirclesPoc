/// <reference path="typings/tsd.d.ts" />
import express = require('express');
import mongoose = require('mongoose');
import bodyParser = require('body-parser');

import path = require('path');

import fs = require('fs');

import indexRoute = require('./routes/index');
import oauthController = require('./controllers/oauthController');

/*************** Configuration ********************/
var CONFIG_FILE = './config.json';
var config;

if (!fs.exists(CONFIG_FILE))
    CONFIG_FILE = './config.default.json';

try {
    // Strip the BOM character as readFileSync doesn't do that.
    var configString = fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, '');
    config = JSON.parse(configString);
}
catch (e) {
    console.log("Error while parsing config file: " + e);
}

var HTTP_PORT = config.server.httpPort;
var HTTPS_PORT = config.server.httpsPort;
var baseUrl = config.server.baseUrl + ":" + HTTPS_PORT;


/************** OAuth controllers ****************/

// GitHub OAuth, just for testing the OAuth controller.
var githubConfig = {
    baseUrl: baseUrl,
    basePath: "/api/auth/github",
    clientID: 'f117ca3a3a913dab3698',
    clientSecret: '1c36a181dc91dacf275b0f1fc8b6fdb65ed92ec9',
    scope: 'notifications',
    oauthSite: "https://github.com/login",
    oauthTokenPath: '/oauth/access_token',
    oauthAuthorizationPath: '/oauth/authorize',
};

var githubOauthController = new oauthController.OAuthController(githubConfig);

var bitReserveConfig = {
    baseUrl: baseUrl,
    basePath: "/api/auth/bitreserve",
    clientID: config.bitReserve.app.clientID,
    clientSecret: config.bitReserve.app.clientSecret,

    scope: "cards:read,cards:write,transactions:read,transactions:write,user:read",
    // BitReserve uses a different domain for the authorization URL. simple-oauth2 doesn't support that.
    // The "site" parameter also may not be empty.
    // As a workaround, we use the greatest common denominator of the two URLs: "https://".
    oauthSite: "https://",
    oauthTokenPath: 'api.bitreserve.org/oauth2/token',
    oauthAuthorizationPath: 'bitreserve.org/authorize/' + config.bitReserve.app.clientID,
}

var bitReserveOauthController = new oauthController.OAuthController(bitReserveConfig);
import bitReserveService = require('./services/bitReserveService');

/**
 * Create a new BitReserve service and get user info from it.
 */
function getBitReserveUserInfo(token: string, callback) {
    var brs = new bitReserveService.BitReserveService(token);
    brs.getUser(callback);
}

bitReserveOauthController.setGetUserInfoFunction(getBitReserveUserInfo);


/******** Express and route setup ***********/

var app = express();
app.use(bodyParser.json());

// Logging
var morgan = require('morgan');
app.use(morgan('dev'));

// Initialize database connection.

// The MongoDB connection is currently only created at the node app startup. It could
// disconnect for some reason.
// TODO: make this more stable, in a way that doesn't require a specific call to Mongoose
// before every request (because that will be forgotten).
var db = mongoose.connect(config.database.url);

// Client folder containing the Angular SPA, serve as static assets
var clientDir = path.join(__dirname, 'client')
app.use(express.static(clientDir));

// All routes which are directly accessible (i.e. not only from within the Angular SPA).
// All open index.html, where Angular handles further routing to the right controller/ view.
// Ideally all routes not matched by server-side routes are forwarded to Angular.
// TODO: introduce an "other" wildcard handler for this.
app.get('/', indexRoute.index);
app.get('/user/profile', indexRoute.index);
app.get('/circle/new', indexRoute.index);
app.get('/circle/:id', indexRoute.index);
app.get('/circle/join/:id', indexRoute.index);
app.get('/circle/list', indexRoute.index);
app.get('/not-found', indexRoute.index);

app.get(githubOauthController.getAuthRoute(), githubOauthController.auth);
app.post(githubOauthController.getCallbackApiRoute(), githubOauthController.callback);
app.get(githubOauthController.getCallbackPublicRoute(), indexRoute.index);

app.get(bitReserveOauthController.getAuthRoute(), bitReserveOauthController.auth);
app.post(bitReserveOauthController.getCallbackApiRoute(), bitReserveOauthController.callback);
app.get(bitReserveOauthController.getCallbackPublicRoute(), indexRoute.index);

// BitReserve API wrapper
import bitReserveController = require('./controllers/bitReserveController');
var brc = new bitReserveController.BitReserveController();
app.get("/api/bitreserve/me/cards", brc.getCards);

// Circle data
import circleAdminController = require('./controllers/circleAdminController');
var cc = new circleAdminController.CircleAdminController;

app.post("/api/circle", cc.create);

import circleMemberController = require('./controllers/circleMemberController');
var cmc = new circleMemberController.CircleMemberController;

app.get("/api/circle", cmc.getAll);
// COULD DO: use route /api/circle/join/:id, post empty message (now post body has to contain Circle ID)
app.post("/api/circle/join", cmc.join);
app.get("/api/circle/:id", cmc.getOne);

/*********************** HTTP server setup ********************/
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