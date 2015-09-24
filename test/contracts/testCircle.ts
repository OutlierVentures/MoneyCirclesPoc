import assert = require('assert');
import web3config = require('../../lib/web3config');

// TODO: support configuration in tests
var web3plus = web3config.createWeb3("http://downtonabbey:8101");
var web3 = web3plus.web3;

describe("Circle contract", () => {
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
        this.timeout(45000);

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
                assert.ok((block.timestamp + margin ) * 1000 >= timeBeforeDeployment, "Block timestamp is after timeBeforeDeployment");
                assert.ok(block.timestamp * 1000 <= timeAfterDeployment, "Block timestamp is before timeBeforeDeployment");
                done();
            });
        });

    });

    it("should add a member and then return it", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(145000);
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

    it("should create a loan and then return it", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(145000);

        var amount = 1000;
        var userId = "user" + Math.round(Math.random() * 1000000);
        var username1 = "The lucky lender";

        var loanIndexBefore = circleContract.loanIndex().toNumber();

        // First create a new member to ensure we create a loan for a member (and this test
        // can be run independently)
        circleContract.addMember(userId, username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newMember = circleContract.members(0);
                // Pass a high amount of gas as this function creates another contract.

                return circleContract.createLoan(userId, amount, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testLoan(tx) {
                var loanIndex = circleContract.loanIndex().toNumber();
                assert.equal(loanIndex, loanIndexBefore + 1);
                var newLoanAddress = circleContract.activeLoans(loanIndex);

                // Verify loan contract is indeed a valid address
                assert.notEqual(newLoanAddress, "0x0000000000000000000000000000000000000000");

                // Get loan amount through sub contract
                var loanContractDefinition = circleContract.allContractTypes.Loan.contractDefinition;
                var loanContract = loanContractDefinition.at(newLoanAddress);

                assert.equal(loanContract.userId(), userId);
                assert.equal(loanContract.amount().toNumber(), amount);
                assert.equal(loanContract.circle(), circleContract.address);


                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    it("should not allow to create a loan for a non-member", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(145000);

        var amount = 1000;
        var userId = "123456789invalid";

        var loanIndexBefore = circleContract.loanIndex().toNumber();

        // Pass a high amount of gas as this function creates another contract.
        circleContract.createLoan(userId, amount, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testLoan(tx) {
                var loanIndex = circleContract.loanIndex().toNumber();

                assert.equal(loanIndex, loanIndexBefore);

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    it("should allow repayment of a loan", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(145000);

        var amount = 2000;
        var userId = "user" + Math.round(Math.random() * 1000000);
        var username1 = "The lucky lender";

        var newLoanAddress;

        var bitReserveTxId = "tx" + Math.round(Math.random() * 1000000);

        var loanIndexBefore = circleContract.loanIndex().toNumber();

        // First create a new member to ensure we create a loan for a member (and this test
        // can be run independently)
        circleContract.addMember(userId, username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                // Create the loan.
                // Pass a high amount of gas as this function creates another contract.

                return circleContract.createLoan(userId, amount, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testLoan(tx) {
                var loanIndex = circleContract.loanIndex().toNumber();
                assert.equal(loanIndex, loanIndexBefore + 1);

                newLoanAddress = circleContract.activeLoans(loanIndex);
                
                // Verify loan contract is indeed a valid address
                assert.notEqual(newLoanAddress, "0x0000000000000000000000000000000000000000");

                return circleContract.setRepaid(newLoanAddress, bitReserveTxId, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testRepayment(tx) {

                // Get loan repayment info through the sub contract
                var loanContractDefinition = circleContract.allContractTypes.Loan.contractDefinition;
                var loanContract = loanContractDefinition.at(newLoanAddress);

                // Verify basics
                assert.equal(loanContract.userId(), userId, "user ID");
                assert.equal(loanContract.amount().toNumber(), amount, "amount");
                assert.equal(loanContract.circle(), circleContract.address, "circle address");

                // Verify repayment
                assert.equal(loanContract.repaymentTransactionId(), bitReserveTxId, "repayment transaction ID");

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    it("should not allow repayment of a loan by calling it directly", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(145000);

        var amount = 3000;
        var userId = "user" + Math.round(Math.random() * 1000000);
        var username1 = "The lucky lender";

        var newLoanAddress;

        var bitReserveTxId = "tx" + Math.round(Math.random() * 1000000);

        var loanIndexBefore = circleContract.loanIndex().toNumber();

        // First create a new member to ensure we create a loan for a member (and this test
        // can be run independently)
        circleContract.addMember(userId, username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                // Create the loan.
                // Pass a high amount of gas as this function creates another contract.

                return circleContract.createLoan(userId, amount, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testLoan(tx) {
                var loanIndex = circleContract.loanIndex().toNumber();
                assert.equal(loanIndex, loanIndexBefore + 1);

                newLoanAddress = circleContract.activeLoans(loanIndex);

                // Verify loan contract is indeed a valid address
                assert.notEqual(newLoanAddress, "0x0000000000000000000000000000000000000000");

                // Get loan repayment info through the sub contract
                var loanContractDefinition = circleContract.allContractTypes.Loan.contractDefinition;
                var loanContract = loanContractDefinition.at(newLoanAddress);

                return loanContract.setRepaid(bitReserveTxId, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testRepayment(tx) {

                // Get loan repayment info through the sub contract
                var loanContractDefinition = circleContract.allContractTypes.Loan.contractDefinition;
                var loanContract = loanContractDefinition.at(newLoanAddress);

                // Verify basics
                assert.equal(loanContract.userId(), userId, "user id");
                assert.equal(loanContract.amount().toNumber(), amount, "amount");
                assert.equal(loanContract.circle(), circleContract.address, "circle address");

                // Verify repayment. The setRepaid should not be processed because it can only be called by
                // the Circle contract.
                assert.equal(loanContract.repaymentTransactionId(), "", "repayment tx id");

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

});
