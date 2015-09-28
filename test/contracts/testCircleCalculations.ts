import assert = require('assert');
import web3config = require('./web3config');

var web3plus = web3config.createWeb3();
var web3 = web3plus.web3;


describe("Circle calculations", () => {
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


    it("should calculate total deposits without a transaction, using call()", function (done) {        
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var amount = 2000;
        var userId = "user" + Math.round(Math.random() * 1000000);
        var username1 = "The lucky lender";

        var depositIndexBefore = circleContract.depositIndex().toNumber();
        var totalDepositsBefore = circleContract.getTotalDepositsAmount().toNumber();

        // First create a new member to ensure we create a deposit for a member (and this test
        // can be run independently)
        circleContract.addMember(userId, username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                return circleContract.createDeposit(userId, amount, "tx111", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                // Create a second deposit
                return circleContract.createDeposit(userId, amount, "tx112", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testLoan(tx) {
                var depositIndex = circleContract.depositIndex().toNumber();
                assert.equal(depositIndex, depositIndexBefore + 2);

                var total = circleContract.getTotalDepositsAmount().toNumber();

                // Verify deposit properties.
                assert.equal(total, totalDepositsBefore + 2 * amount);

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    /**
     * The deposits total can also be computed by calling the function transactionally.
     * To get the results, a Solidity event is used.
     */
    // DISABLED because it was strongly correlated to geth crashing.
    //it("should calculate total deposits using a transaction and an event", function (done) {
    //    // It can take quite a while til transactions are processed.
    //    this.timeout(180000);

    //    var amount = 2000;
    //    var userId = "user" + Math.round(Math.random() * 1000000);
    //    var username1 = "The lucky lender";

    //    var depositIndexBefore = circleContract.depositIndex().toNumber();
    //    var totalDepositsBefore = circleContract.getTotalDepositsAmount().toNumber();

    //    // First create a new member to ensure we create a deposit for a member (and this test
    //    // can be run independently)
    //    circleContract.addMember(userId, username1, { gas: 2500000 })
    //        .then(web3plus.promiseCommital)
    //        .then(function testGetMember(tx) {
    //            return circleContract.createDeposit(userId, amount, "tx114", { gas: 2500000 });
    //        })
    //        .then(web3plus.promiseCommital)
    //        .then(function testGetMember(tx) {
    //            // Create a second deposit
    //            return circleContract.createDeposit(userId, amount, "tx115", { gas: 2500000 });
    //        })
    //        .then(web3plus.promiseCommital)
    //        .then(function testLoan(tx) {
    //            var depositIndex = circleContract.depositIndex().toNumber();
    //            assert.equal(depositIndex, depositIndexBefore + 2);

    //            // Use an event to get the result of the calculation.
    //            var depositsComputedEvent = circleContract.DepositsAmountComputed();

    //            depositsComputedEvent.watch(function (error, result) {
    //                if (error)
    //                    done(error);
    //                else {
    //                    // The outputs of the event arrive in the property "args", by name.
    //                    // In this case the string "value" is the name of the return parameter
    //                    // of event DepositsAmountComputed.
    //                    var total = result.args.value.toNumber();

    //                    // Verify deposit properties.
    //                    assert.equal(total, totalDepositsBefore + 2 * amount);

    //                    done();
    //                }

    //            });

    //            circleContract.calculateTotalDepositsAmount();
    //        })
    //        .catch((reason) => {
    //            done(reason);
    //        });
    //});

    it("should calculate the total loans amount", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var amount = 12345;
        var userId = "user" + Math.round(Math.random() * 1000000);
        var username1 = "The lucky lender";

        var loanIndexBefore = circleContract.loanIndex().toNumber();
        var loanIndex;
        var loanAddress;

        // We create 3 loans in total and set 2 as paid. These steps have to
        // be taken sequentially, because of the limited ways in which we can
        // get a reference to the loan just created. That makes this method
        // very slow.

        // If that were solved, we could do the calls for create/setPaidOut
        // in parallel.

        // First create a new member to ensure we create a loan for a member (and this test
        // can be run independently)
        circleContract.addMember(userId, username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function createDeposit(tx) {
                // Create a big deposit so that we can take out loans.
                return circleContract.createDeposit(userId, amount * 10, "tx111", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function createFirstLoan(tx) {
                return circleContract.createLoan(userId, amount, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function setFirstLoanPaidOut(tx) {

                loanIndex = circleContract.loanIndex().toNumber();
                assert.equal(loanIndex, loanIndexBefore + 1);

                loanAddress = circleContract.loans(loanIndex);

                return circleContract.setPaidOut(loanAddress, "tx" + loanIndex, { gas: 2500000 });
            })
            .then(function createSecondLoan(tx) {
                return circleContract.createLoan(userId, amount, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function setSecondLoanPaidOut(tx) {

                loanIndex = circleContract.loanIndex().toNumber();
                assert.equal(loanIndex, loanIndexBefore + 2);

                loanAddress = circleContract.loans(loanIndex);

                return circleContract.setPaidOut(loanAddress, "tx" + loanIndex, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function createThirdLoan(tx) {
                return circleContract.createLoan(userId, amount, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testCalculation(tx) {
                var loanIndex = circleContract.loanIndex().toNumber();
                // 3 loans in total
                assert.equal(loanIndex, loanIndexBefore + 3);

                var totalPaid = circleContract.getTotalPaidLoansAmount().toNumber();

                // As 2 loans are paid out and the other isn't, the total amount should be equal to 
                // that of the first two loans.
                assert.equal(totalPaid, 2 * amount);

                var totalActive = circleContract.getTotalActiveLoansAmount().toNumber();

                // As 2 loans are paid out and the other isn't, the total amount should be equal to 
                // that of the first two loans.
                assert.equal(totalActive, 3 * amount);


                done();
            })
            .catch((reason) => {
                done(reason);
            });
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

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

    it("should calculate the member balance", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(180000);

        var amount = 12345;
        var userId = "user" + Math.round(Math.random() * 1000000);
        var username1 = "The lucky lender";
        var userId2 = "user" + Math.round(Math.random() * 1000000);
        var username2 = "The other lucky lender";

        var loanIndexBefore = circleContract.loanIndex().toNumber();
        var loanIndex;
        var loanAddress;

        var balanceBefore = circleContract.getBalance().toNumber();

        // We create 1 deposit and 1 loan, then compute the balance.

        // First create a new member to ensure we create a loan for a member (and this test
        // can be run independently)
        circleContract.addMember(userId, username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function createDeposit(tx) {
                // Deposit of 3x amount by member 1
                return circleContract.createDeposit(userId, amount * 3, "tx111", { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function createMember2(tx) {
                return circleContract.addMember(userId2, username2, { gas: 2500000 })
            })
            .then(web3plus.promiseCommital)
            .then(function createDeposit(tx) {
                // Deposit of 4x amount by member 2
                return circleContract.createDeposit(userId2, amount * 4, "tx112", { gas: 2500000 });
            }).then(web3plus.promiseCommital)
            .then(function createFirstLoan(tx) {
                // Loan of 1x amount + 100, paid out by member 1
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
                // Calculate and check balances
                var member1balance = circleContract.getMemberBalance(userId).toNumber();
                assert.equal(member1balance, 2 * amount - 100);

                var member2balance = circleContract.getMemberBalance(userId2).toNumber();
                assert.equal(member2balance, 4 * amount);

                var circleBalance = circleContract.getBalance().toNumber();
                assert.equal(circleBalance, balanceBefore + 6 * amount - 100);
                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

});
