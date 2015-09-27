import assert = require('assert');
import web3config = require('./web3config');

var web3plus = web3config.createWeb3();
var web3 = web3plus.web3;


describe("Circle available balance calculation", () => {
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

    it("should calculate the available balance", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var amount = 12345;
        var userId = "user" + Math.round(Math.random() * 1000000);
        var username1 = "The lucky lender";

        // This test has to be run from a clean situation because it contains absolute amounts.
        var loanIndexBefore = 0;
        var loanIndex;
        var loanAddress;

        // We create 1 deposit and 1 loan, then compute the balance.

        // First create a new member to ensure we create a loan for a member (and this test
        // can be run independently)
        circleContract.addMember(userId, username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function createDeposit(tx) {
                return circleContract.createDeposit(userId, 50000, "tx111", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function createFirstLoan(tx) {
                return circleContract.createLoan(userId, 20000, { gas: 2500000 });
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
                var totalDeposits = circleContract.getTotalDepositsAmount().toNumber();
                assert.equal(totalDeposits, 50000, "totalDeposits");

                var balance = circleContract.getBalance().toNumber();
                assert.equal(balance, 30000, "balance");

                var availableBalance = circleContract.getAvailableBalance().toNumber();
                assert.equal(availableBalance, 20000);

                loanIndexBefore = circleContract.loanIndex().toNumber();

                // Try to create a loan that's not allowed.
                return circleContract.createLoan(userId, 20001, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function createAllowedLoan(tx) {
                // A loan should not have been created.    
                loanIndex = circleContract.loanIndex().toNumber();
                assert.equal(loanIndex, loanIndexBefore);

                return circleContract.createLoan(userId, 20000, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function checkLoanAndBalance(tx) {
                // This loan should be allowed.
                loanIndex = circleContract.loanIndex().toNumber();
                assert.equal(loanIndex, loanIndexBefore + 1);

                // No balance should be left as we took it all.
                var availableBalance = circleContract.getAvailableBalance().toNumber();
                assert.equal(availableBalance, 0);

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });


});
