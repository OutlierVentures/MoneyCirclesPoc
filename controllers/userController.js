var userModel = require("../models/userModel");
var repository = userModel.repository;
function createUser(req, res) {
    var userName = req.params.name;
    repository.create({ name: userName }, function (error) {
        if (error) {
            res.send(400);
        }
        else {
            res.send("user " + userName + " created");
        }
    });
}
exports.createUser = createUser;
function retrieveUser(req, res) {
    var userName = req.params.name;
    repository.findOne({ name: userName }, function (error, user) {
        if (error) {
            res.send(400);
        }
        else {
            res.send("user name " + user.name + " retrieved");
        }
    });
}
exports.retrieveUser = retrieveUser;
exports.model = userModel;
//# sourceMappingURL=userController.js.map