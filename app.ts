var express = require('express'),
    app = express();

var oauth2 = require('simple-oauth2')({
    clientID: 'f117ca3a3a913dab3698',
    clientSecret: '1c36a181dc91dacf275b0f1fc8b6fdb65ed92ec9',
    site: 'https://github.com/login',
    tokenPath: '/oauth/access_token',
    authorizationPath: '/oauth/authorize'
});

// Authorization uri definition
var authorization_uri = oauth2.authCode.authorizeURL({
    redirect_uri: 'http://localhost:3000/callback',
    scope: 'notifications',
    state: '3(#0/!~'
});

// Initial page redirecting to Github
app.get('/auth', function (req, res) {
    res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', function (req, res) {
    var code = req.query.code;
    console.log('/callback');
    oauth2.authCode.getToken({
        code: code,
        redirect_uri: 'http://localhost:3000/callback'
    }, saveToken);

    function saveToken(error, result) {
        if (error) { console.log('Access Token Error', error.message); }
        var token = oauth2.accessToken.create(result);
        res.send("Yay! You\'ve authenticated. This is what we got back: " + token.token);
    }
});

app.get('/', function (req, res) {
    res.send('Hello<br><a href="/auth">Log in with Github</a>');
});

app.listen(3000);

console.log('Express server started on port 3000');