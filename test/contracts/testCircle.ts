import assert = require('assert');
import web3config = require('../../lib/web3config');

// TODO: support configuration in tests
var web3plus = web3config.createWeb3("http://downtonabbey:8101");

describe("Circle contract", () => {
    /**
     * The Solidity web3 contract.
     */
    var contract;
    var testName = "A testing circle";
    var testCommonBond = "For all of those who love testing";

    before(function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(45000);

        web3plus.deployContractFromFile("Circle.sol",
            "Circle",
            true,
            function (err, res) {
                contract = res;
                done(err);
            },
            testName,
            testCommonBond);
    });

    it("should have the properties set at construction", function (done) {
        this.timeout(10000);

        assert.equal(contract.name(), testName);
        assert.equal(contract.commonBond(), testCommonBond);
        done();
    });

    it("should add a member and then return it", function (done) {
        // It can take quite a while til transactions are processed.
        this.timeout(145000);
        var username1 = "happylender1";
        var username2 = "another";

        contract.addMember(100, username1, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newMember = contract.members(0);
                assert.equal(newMember[1], username1);
                return contract.addMember(102, username2);
            })
            .then(web3plus.promiseCommital)
            .then(function testGetMember(tx) {
                var newMember = contract.members(1);
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
        var userId = 1;

        // Pass a high amount of gas as this function creates another contract.
        contract.createLoan(userId, amount, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function testLoan(tx) {
                var numLoans = contract.numLoans().toNumber();
                assert.equal(numLoans, 1);
                var newLoanAddress = contract.activeLoans(0);

                // Verify loan contract is indeed a valid address
                assert.notEqual(newLoanAddress, "0x0000000000000000000000000000000000000000");

                // Get loan amount through sub contract
                var loanContractDefinition = contract.allContractTypes.Loan.contractDefinition;
                var loanContract = loanContractDefinition.at(newLoanAddress);

                assert.equal(loanContract.amount().toNumber(), amount);

                done();
            })
            .catch((reason) => {
                done(reason);
            });
    });

});
