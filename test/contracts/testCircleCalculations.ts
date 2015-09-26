import assert = require('assert');
import web3config = require('./web3config');

var web3plus = web3config.createWeb3();
var web3 = web3plus.web3;


describe("Circle contract calculations", () => {
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

    it("should allow a call to total deposits without a transaction", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(145000);

        var amount = 2000;
        var userId = "user" + Math.round(Math.random() * 1000000);
        var username1 = "The lucky lender";

        var depositIndexBefore = circleContract.depositIndex().toNumber();

        // Can we get the results by using .call()?
        var total = circleContract.getTotalDepositsAmount.call();

        done();
    });

    /**
     * The deposits total can also be computed by calling the function transactionally.
     * To get the results, a Solidity event is used.
     */
    it("should calculate total using a transaction and an event", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(145000);

        var amount = 2000;
        var userId = "user" + Math.round(Math.random() * 1000000);
        var username1 = "The lucky lender";

        var depositIndexBefore = circleContract.depositIndex().toNumber();

        // First create a new member to ensure we create a deposit for a member (and this test
        // can be run independently)
        circleContract.addMember(userId, username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                return circleContract.createDeposit(userId, amount, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                // Create a second deposit
                return circleContract.createDeposit(userId, amount, { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function testLoan(tx) {
                var depositIndex = circleContract.depositIndex().toNumber();
                assert.equal(depositIndex, depositIndexBefore + 2);

                // Use an event to get the result of the calculation.
                var depositsComputedEvent = circleContract.DepositsAmountComputed();

                depositsComputedEvent.watch(function (error, result) {
                    if (error)
                        done(error);
                    else {
                        // The outputs of the event arrive in the property "args", by name.
                        // In this case the string "value" is the name of the return parameter
                        // of event DepositsAmountComputed.
                        var total = result.args.value.toNumber();

                        // Verify deposit properties.
                        assert.equal(total, 2 * amount);

                        done();
                    }

                });

                circleContract.calculateTotalDepositsAmount();
            })
            .catch((reason) => {
                done(reason);
            });
    });
});
