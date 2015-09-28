/// <reference path="typings/tsd.d.ts" />
import express = require('express');
import mongoose = require('mongoose');
import bodyParser = require('body-parser');
import web3config = require('./lib/web3config');
import assert = require('assert');


var web3 = require("web3");

import path = require('path');

import fs = require('fs');

import indexRoute = require('./routes/index');
import oauthController = require('./controllers/oauthController');


/*************** Configuration ********************/
var CONFIG_FILE = './config.json';
var config: IApplicationConfig;
var configString: string;

// We don't use fs.exists() to try to read the file; the recommended method is just opening and
// handling an error: https://nodejs.org/api/fs.html#fs_fs_exists_path_callback
try {
    configString = fs.readFileSync(CONFIG_FILE, 'utf8');
}
catch (e) {
    try {
        CONFIG_FILE = './config.default.json';
        configString = fs.readFileSync(CONFIG_FILE, 'utf8');
    }
    catch (e2) {
        console.log("Error while loading config file: " + e2);
        // TODO: exit with error. No run without a valid config.
    }
}

console.log("Using configuration from " + CONFIG_FILE);
// Strip the BOM character as readFileSync doesn't do that.
configString = configString.replace(/^\uFEFF/, '');
try {
    // Parse config file.
    config = JSON.parse(configString);
}
catch (e) {
    console.log("Error while parsing config file: " + e);
    // TODO: exit with error. No run without a valid config.
}

console.log("My configuration:");
console.log(config);

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
    adminUserId: config.bitReserve.circleVaultAccount.userName
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
    adminUserId: config.bitReserve.circleVaultAccount.userName
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

/******** Ethereum / web3 setup *************/

var web3plus = web3config.createWeb3(config.ethereum.jsonRpcUrl);

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
app.get('/user/login', indexRoute.index);
app.get('/circle/new', indexRoute.index);
app.get('/circle/:id', indexRoute.index);
app.get('/circle/:id/join', indexRoute.index);
app.get('/circle/:id/deposit', indexRoute.index);
app.get('/circle/:id/loan', indexRoute.index);
app.get('/circle/list', indexRoute.index);
app.get('/loan/list', indexRoute.index);
app.get('/loan/:id', indexRoute.index);
app.get('/loan/:id/repay', indexRoute.index);
app.get('/audit', indexRoute.index);
app.get('/audit/circle/:id', indexRoute.index);
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
app.get("/api/bitreserve/me/cards/withBalance", brc.getCardsWithBalance);

// Circle data
import circleAdminController = require('./controllers/circleAdminController');
var cc = new circleAdminController.CircleAdminController;

app.post("/api/circle", cc.create);

import circleMemberController = require('./controllers/circleMemberController');
var cmc = new circleMemberController.CircleMemberController(config);

app.get("/api/circle", cmc.getAll);
// COULD DO: use route /api/circle/join/:id, post empty message (now post body has to contain Circle ID)
app.post("/api/circle/join", cmc.join);
app.get("/api/circle/:id", cmc.getOne);
app.get("/api/circle/:id/statistics", cmc.getStatistics);

app.post("/api/circle/:id/deposit", cmc.deposit);
app.post("/api/circle/:id/loan", cmc.loan);

import loanController = require('./controllers/loanController');
var lc = new loanController.LoanController(config);

app.get("/api/loan", lc.getAll);
app.get("/api/loan/:id", lc.getOne);
app.post("/api/loan/:id/repay", lc.repay);

import auditController = require('./controllers/auditController');
var ac = new auditController.AuditController(config);
app.get("/api/audit/circle", ac.getList);
app.get("/api/audit/circle/vault", ac.getCircleVaultData);
//app.get("/api/audit/circle/:id", ac.getCircleDetails);

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
