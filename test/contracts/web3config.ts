import web3plus = require('../../node_modules/web3plus/lib/web3plus');
import path = require('path');

export function createWeb3() {
    // TODO: read from config file.
    var jsonRpcUrl = "http://downtonabbey:8101";
    web3plus.initialize(jsonRpcUrl, path.resolve(__dirname + '/../../contracts'));

    return web3plus;
}
