import assert = require('assert');
import web3config = require('./web3config');

var web3plus = web3config.createWeb3();
var web3 = web3plus.web3;

describe("Circle", () => {
    /**
     * The Solidity web3 contract.
     */
    var circleContract;
    var testName = "A testing circle";
    var testCommonBond = "For all of those who love testing";

    var timeBeforeDeployment: number;
    var timeAfterDeployment: number;

    before(function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        timeBeforeDeployment = Date.now();

        web3plus.deployContractFromFile("Circle.sol",
            "Circle",
            true,
            function (err, res) {
                timeAfterDeployment = Date.now();
                circleContract = res;
                done(err);
            },
            testName,
            testCommonBond);
    });

    it("should have the properties set at construction", function (done) {
        this.timeout(10000);

        assert.equal(circleContract.name(), testName);
        assert.equal(circleContract.commonBond(), testCommonBond);
        done();
    });


    it("should have a correct creation time", function (done) {
        this.timeout(10000);

        // Get the creation time of the Circle from the blockchain through block.timestamp,
        // and verify that it is correct.

        // To facilitate this for calling code, a convenience function getCreationTime() could
        // be created in web3plus.enhanceContract().

        web3.eth.getTransaction(circleContract.transactionHash, function processTransactionInfo(err, tx) {
            web3.eth.getBlock(tx.blockNumber, function processBlockInfo(err, block) {
                // Allow a margin of some seconds between the time measurement in the test code
                // and the block time on the blockchain node.
                var margin = 10;

                // block.timestamp is specified in seconds, Date.now() in milliseconds.
                assert.ok((block.timestamp + margin) * 1000 >= timeBeforeDeployment, "Block timestamp is after timeBeforeDeployment");
                assert.ok(block.timestamp * 1000 <= timeAfterDeployment, "Block timestamp is before timeBeforeDeployment");
                done();
            });
        });

    });

    it("should add a member and then return it", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);
        var username1 = "happylender1";
        var username2 = "another";

        circleContract.addMember("101", username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newMember = circleContract.members(1);

                assert.equal(newMember[1], username1);

                // Assert the user ID
                // This test fails intermittently. The ID is sometimes "", while the user name is set correctly.
                assert.equal(newMember[0], "101");
                return circleContract.addMember("102", username2, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newMember = circleContract.members(2);
                assert.equal(newMember[0], "102");
                assert.equal(newMember[1], username2);
                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    it("should not allow adding the same member ID more than once", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);
        var userId1 = "user" + Math.round(Math.random() * 1000000);
        var username1 = "happylender1";

        var memberIndex: number;

        circleContract.addMember(userId1, username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                memberIndex = circleContract.memberIndex().toNumber();
                var newMember = circleContract.members(memberIndex);

                assert.equal(newMember[1], username1);

                // Try to add the same member again
                return circleContract.addMember(userId1, username1, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newMemberIndex = circleContract.memberIndex().toNumber();

                assert.equal(memberIndex, newMemberIndex, "memberIndex after adding the same user twice");
                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });
});
