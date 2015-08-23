var request = require('request');
module.exports = function () {
    /**
     * Gets info about the current user.
     */
    function getUser(authorizationToken, callback) {
        // Enable request debugging
        // TODO: make configurable (config debug option)
        require('request').debug = true;
        console.log("Calling API with token: " + authorizationToken);
        request.get('https://api.bitreserve.org/v0/me', {
            headers: {
                "Authorization": "Bearer " + authorizationToken
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var userData = JSON.parse(body);
                // Create a new user array.
                // TODO: create an interface for this (can't be IUser because that extends Mongoose.Document).
                var user = {
                    name: userData.name,
                    externalID: userData.email,
                };
                callback(null, user);
            }
            else {
                console.log("Error getting user data: " + error);
                callback(error, null);
            }
        });
    }
    return {
        'getUser': getUser,
    };
};
//# sourceMappingURL=bitReserveService.js.map