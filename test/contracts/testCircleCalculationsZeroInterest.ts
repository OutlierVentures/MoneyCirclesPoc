import assert = require('assert');
import web3config = require('./web3config');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;


describe("Circle calculations with 0% interest", () => {
    /**
     * The Solidity web3 contract.
     */
    var circleContract;
    var testName = "A testing circle";
    var testCommonBond = "For all of those who love testing";
    var testInterest = 0;

    var timeBeforeDeployment: number;
    var timeAfterDeployment: number;

    before(function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        web3plus = web3config.createWeb3();

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
            testCommonBond,
            testInterest);
    });

    it("should calculate the balance", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var amount = 12345;
        var userId = "user" + Math.round(Math.random() * 1000000);
        var username1 = "The lucky lender";

        var loanIndexBefore = circleContract.loanIndex().toNumber();
        var loanIndex;
        var loanAddress;

        var balanceBefore = circleContract.getBalance().toNumber();
        var interestBefore = circleContract.getTotalRepaidInterestAmount().toNumber();

        // We create 1 deposit and 1 loan, then compute the balance.

        // First create a new member to ensure we create a loan for a member (and this test
        // can be run independently)
        circleContract.addMember(userId, username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function createDeposit(tx) {
                // Deposit of 3x amount
                return circleContract.createDeposit(userId, amount * 3, "tx111", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function createFirstLoan(tx) {
                // Loan of 1x amount + 100, paid out
                return circleContract.createLoan(userId, amount + 100, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function setFirstLoanPaidOut(tx) {

                loanIndex = circleContract.loanIndex().toNumber();
                assert.equal(loanIndex, loanIndexBefore + 1);

                loanAddress = circleContract.loans(loanIndex);

                return circleContract.setPaidOut(loanAddress, "tx" + loanIndex, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testCalculation(tx) {
                // Calculate and check balance
                var balance = circleContract.getBalance().toNumber();
                assert.equal(balance, balanceBefore + 2 * amount - 100);

                var interest = circleContract.getTotalRepaidInterestAmount().toNumber();
                assert.equal(interest, interestBefore);

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });
});
