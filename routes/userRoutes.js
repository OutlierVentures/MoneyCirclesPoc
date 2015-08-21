var controller = require("../controllers/userController");
/*
 * User Routes
 */
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