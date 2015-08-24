var bitReserveService = require("../services/bitReserveService");
var bitReserveController = (function () {
    function bitReserveController() {
    }
    bitReserveController.prototype.getCards = function (req, res) {
        var token = req.header("AccessToken");
        var brs = new bitReserveService.bitReserveService(token);
        brs.getCards(function (err, cards) {
            if (err) {
                res.json(500, {
                    "status": "Error",
                    "error": err,
                });
            }
            else {
                res.json(cards);
            }
        });
    };
    return bitReserveController;
})();
exports.bitReserveController = bitReserveController;
//# sourceMappingURL=bitReserveController.js.map