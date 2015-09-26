import assert = require('assert');
import web3config = require('./web3config');

var web3plus = web3config.createWeb3();
var web3 = web3plus.web3;

describe("Circle financial transactions", () => {
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
                var newLoanAddress = circleContract.loans(loanIndex);

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
        var loanContract;

        var payoutTxId = "tx" + Math.round(Math.random() * 1000000);
        var repaymentTxId = "tx" + Math.round(Math.random() * 1000000);

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

                newLoanAddress = circleContract.loans(loanIndex);

                // Verify loan contract is indeed a valid address
                assert.notEqual(newLoanAddress, "0x0000000000000000000000000000000000000000");

                return circleContract.setPaidOut(newLoanAddress, payoutTxId, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testLoan(tx) {
                // Get loan repayment info through the sub contract
                var loanContractDefinition = circleContract.allContractTypes.Loan.contractDefinition;
                loanContract = loanContractDefinition.at(newLoanAddress);

                // Verify payout
                assert.equal(loanContract.payoutTransactionId(), payoutTxId, "payout transaction ID");

                // After payout, set it as repaid
                return circleContract.setRepaid(newLoanAddress, repaymentTxId, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testRepayment(tx) {


                // Verify basics
                assert.equal(loanContract.userId(), userId, "user ID");
                assert.equal(loanContract.amount().toNumber(), amount, "amount");
                assert.equal(loanContract.circle(), circleContract.address, "circle address");

                // Verify repayment
                assert.equal(loanContract.repaymentTransactionId(), repaymentTxId, "repayment transaction ID");

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    it("should not allow repayment of a loan before it has been paid out", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(145000);

        var amount = 2000;
        var userId = "user" + Math.round(Math.random() * 1000000);
        var username1 = "The lucky lender";

        var newLoanAddress;

        var repaymentTxId = "tx" + Math.round(Math.random() * 1000000);

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

                newLoanAddress = circleContract.loans(loanIndex);

                // Verify loan contract is indeed a valid address
                assert.notEqual(newLoanAddress, "0x0000000000000000000000000000000000000000");

                return circleContract.setRepaid(newLoanAddress, repaymentTxId, { gas: 2500000 });
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

                // Verify repayment is not stored
                assert.equal(loanContract.repaymentTransactionId(), "", "repayment transaction ID");

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

                newLoanAddress = circleContract.loans(loanIndex);

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


    it("should create a deposit and then return it", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(145000);

        var amount = 1000;
        var userId = "user" + Math.round(Math.random() * 1000000);
        var username1 = "The lucky lender";

        var depositIndexBefore = circleContract.depositIndex().toNumber();

        // First create a new member to ensure we create a deposit for a member (and this test
        // can be run independently)
        circleContract.addMember(userId, username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newMember = circleContract.members(0);

                return circleContract.createDeposit(userId, amount, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testLoan(tx) {
                var depositIndex = circleContract.depositIndex().toNumber();
                assert.equal(depositIndex, depositIndexBefore + 1);
                var newDeposit = circleContract.deposits(depositIndex);

                // Verify deposit properties.
                assert.equal(newDeposit[0], userId);
                assert.equal(newDeposit[1].toNumber(), amount);

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });


});

