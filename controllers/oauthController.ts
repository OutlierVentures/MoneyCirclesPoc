import querystring = require('querystring');
import userModel = require('../models/userModel');

// TODO: remove duplicate with server.ts. Make base URL configurable.
var PORT = 3123;

var oauth2 = require('simple-oauth2')({
    clientID: 'f117ca3a3a913dab3698',
    clientSecret: '1c36a181dc91dacf275b0f1fc8b6fdb65ed92ec9',
    site: 'https://github.com/login',
    tokenPath: '/oauth/access_token',
    authorizationPath: '/oauth/authorize'
});

// Authorization uri definition
var authorization_uri = oauth2.authCode.authorizeURL({
    redirect_uri: 'http://localhost:' + PORT + '/callback',
    scope: 'notifications',
    state: '3(#0/!~'
});

// Initial page redirecting to Github
export function auth(req, res) {
    res.redirect(authorization_uri);
};

// Callback service parsing the authorization token and asking for the access token
export function callback(req, res) {
    var code = req.query.code;

    oauth2.authCode.getToken({
        code: code,
        redirect_uri: 'http://localhost:' + PORT + '/callback'
    }, saveToken);

    function saveToken(error, result) {
        if (error) { console.log('Access Token Error', error.message); }
        var token = oauth2.accessToken.create(result);
        // res.send("Yay! You\'ve authenticated. This is what we got back: " + token.token);

        var parsed = querystring.parse(token.token);

        var accessToken = parsed.access_token;

        // Get the user from the OAuth provider
        var externalUserID = '123';
        
        // Get the user from our side, or create it.
        userModel.repository.findOne({ externalID: externalUserID }, function (err, user) {
            // TODO: use promise to wait for creating new user.
            if (!user) {
                // User didn't exist yet
                userModel.repository.create({
                    name: "New user",
                    externalID: externalUserID,
                    accessToken: accessToken,
                }, function (userErr, userRes) {
                    // Handle result                    
                    res.send("Welcome, new user " + userRes.name + "!");
                });
            }
            else {
                // Store the token
                user.accessToken = accessToken;

                // Save it
                userModel.repository.update({ name: user.name }, user, function (saveErr, affectedRows, raw) {
                    if (saveErr) {
                        res.send("Something went wrong when storing your data :(");
                    } else {
                        res.send("Welcome back, user " + user.name + "!");
                    }
                });
            }
        });

    }
};