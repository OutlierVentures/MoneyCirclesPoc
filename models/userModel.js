var mongoose = require("mongoose");
exports.userSchema = new mongoose.Schema({
    name: String,
    externalID: String,
    accessToken: String
});
exports.repository = mongoose.model("Users", exports.userSchema);
//# sourceMappingURL=userModel.js.map