/// <reference path="typings/tsd.d.ts" />
var express = require('express');
var mongoose = require('mongoose');
var routes = require('./routes/index');
var userController = require('./controllers/userController');
var oauthController = require('./controllers/oauthController');
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
//# sourceMappingURL=server.js.map