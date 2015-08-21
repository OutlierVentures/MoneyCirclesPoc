var controller = require("../controllers/userController");
/*
 * User Routes
 */
function list(req, res) {
    res.send("respond a resource");
}
exports.list = list;
;
function create(req, res) {
    controller.createUser(req, res);
}
exports.create = create;
;
function read(req, res) {
    controller.retrieveUser(req, res);
}
exports.read = read;
;
//# sourceMappingURL=userRoutes.js.map