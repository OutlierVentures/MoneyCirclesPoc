/// <reference path="typings/tsd.d.ts" />
import express = require('express');
import mongoose = require('mongoose');
import routes = require('./routes/index');
import user = require('./routes/userRoutes');
import http = require('http');
import path = require('path');

import userController = require('./controllers/userController');

import oauthController = require('./controllers/oauthController');

var PORT = 3123;

var app = express();

// TODO: store in config file.
var db = mongoose.connect("mongodb://moneycircles-bitreserve-poc-dev-user:iPBNE0ZeQRPbsHOVWEUi@ds035593.mongolab.com:35593/moneycircles-bitreserve-poc-dev");

app.use(express.static(__dirname + '/views'));

app.get('/', routes.index);
//app.get('/users', userController.list);
app.get('/users/:name', userController.retrieveUser);
app.post('/users/:name', userController.createUser);

app.get('/auth', oauthController.auth);
app.get('/callback', oauthController.callback);

app.listen(PORT);

console.log('Express server started on port ' + PORT);