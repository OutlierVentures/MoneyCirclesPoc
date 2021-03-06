/**
 * A loan taken out of a circle.
 */
contract Loan {
    /**
     * The amount that was loaned, in pence GBP.
     */
    uint public amount;
    
    /**
     * The interest percentage in hundredths of a percent point. I.e.
     * a value of 1 means 0.01%.
     */
    uint public interestPercentage;

    /**
     * The MoneyCircles userId that took out the loan. The userId is
     * the ID as present in the MoneyCircles database.
     */
    string public userId;

    /**
     * SHA3 hash of the user ID for comparisons.
     * Type conversions between string and bytesN in Solidity
     * and between Solidity and Javascript are still pretty rough.
     */
    bytes32 public userIdHash;
    
    /**
     * The Circle that this loan was taken out from.
     */
    address public circle;

    /**
     * The Uphold transaction ID where this loan was payed out.
     */
    string public payoutTransactionId;

    // How to check whether a string is null or empty? Using a == ""
    // is not allowed by the compiler (sees "" as bytes0)
    bool public isPaidOut;

    /**
     * The Uphold transaction ID where this loan was payed repaid.
     */
    string public repaymentTransactionId;

    bool public isRepaid;
    
    /**
     * Returns the total amount of interest, rounded to pence GBP.
     */
    function getInterestAmount() constant returns (uint interestAmount) {
        interestAmount = (interestPercentage * amount) / 10000;
        return interestAmount;
    }
    
    /**
     * Returns the total amount to be repaid including interest.
     */ 
    function getRepaymentAmount() constant returns (uint repaymentAmount) {
        repaymentAmount = amount + getInterestAmount();
    }

    /**
     * Confirm that the loan has been paid out by referring to the Uphold
     * transaction in which it was paid.
     */
    function setPaidOut(string bitReserveTxId) {
        if(msg.sender != circle)
            return;

        // Don't allow updating the tx ID.
        // Weakness: as the contract has no window to the outside world, we
        // can't see whether this is a real transaction, has the right amount,
        // is sent to the right recipient etc. Hence the transaction ID has
        // to be correct on the first go.
        //
        // A possible way to improve this is to allow only a fixed of oracles
        // to set (or confirm) the repayment transaction ID after having
        // verified it in "the real world". Storing the tx id's could then be
        // a two-step process and the functionality would be more decentralized.
        if(isPaidOut)
            return;

        payoutTransactionId = bitReserveTxId;
        isPaidOut = true;
    }

    /**
     * Confirm that the loan has been repaid by referring to the Uphold
     * transaction in which it was paid.
     */
    function setRepaid(string bitReserveTxId) {
        if(msg.sender != circle)
            return;

        // Only allow repayment after paying out.
        if(!isPaidOut)
            return;

        // Don't allow updating the tx ID.
        if(isRepaid)
            return;

        repaymentTransactionId = bitReserveTxId;
        isRepaid = true;
    }

    function Loan(string newUserId, uint newAmount, uint newInterestPercentage) {
        userId = newUserId;
        userIdHash = sha3(newUserId);
        amount = newAmount;
        // We store the sender of the message as the circle address.
        // This adds some form of security: if anyone else would create a
        // Loan, and the address would not be from a Circle contract, that
        // Loan is not considered valid.
        circle = msg.sender;
        interestPercentage = newInterestPercentage;
    }
}

/**
 * A single Money Circle. The entry contract for all properties.
 */
contract Circle {
    string public name;
    string public commonBond;
    address public creator;
    
    /**
     * The interest percentage for loans in hundredths of a percent 
     * point. I.e. a value of 1 means 0.01%.
     */
    uint public interestPercentage;
    
    
    /**
     * The minimal percentage of deposited funds that must remain in
     * the Circle. No loans can be taken out below this percentage.
     */
    uint public constant minimumBalancePercentage = 20;

    function Circle(string newName, string newCommonBond, uint newInterestPercentage) {
        name = newName;
        commonBond = newCommonBond;
        creator = msg.sender;
        interestPercentage = newInterestPercentage;
    }

    struct Member {
        string id;
        string username;
    }
    
    /**
     * A deposit to the Circle funds.
     */
    struct Deposit {
        /**
         * The member that the deposit is from.
         */
        string memberId;
        
        bytes32 memberIdHash;
        /**
         * Amount in pence.
         */
        uint amount;
        /**
         * The Uphold transaction of the member to the Circle.
         */
        string transactionId;
    }

    /**
     * The member list. Join date/time can be derived from the blockchain.
     */
    mapping(uint => Member) public members;
    uint public memberIndex;

    /**
     * Index of the members by sha3(id), for getting members by ID.
     * Not done as string => uint because not supported by Solidity.
     * This is probably very inefficient because of the sha3().
     */
    mapping(bytes32 => uint) public memberIndexByIdHash;

    /**
     * All loans of this circle. Loans aren't removed from this list
     * when they are repaid yet.
     */
    mapping(uint => Loan) public loans;
    uint public loanIndex;
    
    /**
     * All deposits.
     */
    mapping(uint => Deposit) public deposits;
    uint public depositIndex;

    /**
     * Add a new member to the Circle.
     */
    function addMember(string id, string userName) {
        if(msg.sender != creator)
            return;

        // Don't allow adding the same user twice.
        if(memberIndexByIdHash[sha3(id)] > 0)
            return;

        memberIndex++;

        Member m = members[memberIndex];
        m.id = id;
        m.username = userName;
        memberIndexByIdHash[sha3(id)] = memberIndex;
    }
    
    /**
     * Returns the amount available for new loans, taking into
     * account the minimum balance percentage.
     */
    function getAvailableBalance() constant returns (uint amount){
        uint minimumAvailableAmount = getTotalDepositsAmount() * minimumBalancePercentage / 100;
        
        return getBalance() - minimumAvailableAmount;
    }

    /**
     * Create a new loan for a member.
     */
    function createLoan(string memberId, uint amount) returns (Loan l) {
        if(msg.sender != creator)
            return;

        // Only allow loans by members.
        if(memberIndexByIdHash[sha3(memberId)] == 0)
           return;
        
        // Only allow loans if they're within the available balance.
        if(amount > getAvailableBalance())
            return;

        loanIndex++;

        l = new Loan(memberId, amount, interestPercentage);
        loans[loanIndex] = l;

        return l;
    }

    /**
     * Confirm that the loan has been paid out by referring to the Uphold
     * transaction in which it was paid.
     */
   function setPaidOut(Loan l, string bitReserveTxId) {
        if(msg.sender != creator)
            return;

        // Check if this loan is ours. Note that the Loan does this too.
        // TODO

        l.setPaidOut(bitReserveTxId);
    }

    /**
     * Confirm that the loan has been repaid by referring to the Uphold
     * transaction in which it was paid.
     */
    function setRepaid(Loan l, string bitReserveTxId) {
        if(msg.sender != creator)
            return;

        // The Loan checks whether it belongs to this circle. Hence
        // we just call it.
        l.setRepaid(bitReserveTxId);
    }
    
    /**
     * Register a deposit of a member.
     */
    function createDeposit(string memberId, uint amount, string transactionId) {
         if(msg.sender != creator)
            return;

        // Only allow loans by members.
        if(memberIndexByIdHash[sha3(memberId)] == 0)
           return;

        depositIndex++;

        Deposit d = deposits[depositIndex];
        d.memberId = memberId;
        d.memberIdHash = sha3(memberId);
        d.amount = amount;
        d.transactionId = transactionId;
    }
    
    /**
     * Fired when the total amount of deposits has been computed.
     * Uses an event because transactional methods can't return
     * data to the outside world.
     */
    event DepositsAmountComputed(uint value);
    
    /**
     * Get the total amount of all deposits.
     */
    function getTotalDepositsAmount() constant returns (uint totalDepositsAmount) {
        for (uint i = 1; i <= depositIndex; i++) 
        {
            totalDepositsAmount += deposits[i].amount;
        }
        return totalDepositsAmount;
    }

    /**
     * Calculates the total amount of all deposits and emits it
     * using the event DepositsAmountComputed. More of a testing
     * function than anything else.
     */
    function calculateTotalDepositsAmount() {
        uint totalDepositsAmount;
        for (uint i = 1; i <= depositIndex; i++) 
        {
            totalDepositsAmount += deposits[i].amount;
        }
        DepositsAmountComputed(totalDepositsAmount);
    }

    /**
     * Get the total amount of all loans that have not been repaid.
     */
    function getTotalActiveLoansAmount() constant returns (uint totalLoansAmount) {
        for (uint i = 1; i <= loanIndex; i++) 
        {
            var l = loans[i];
            if(!l.isRepaid())
            {
                totalLoansAmount += l.amount();
            }
        }
        return totalLoansAmount;
    }
    
    
    /**
     * Get the total amount of all loans, excluding the ones that haven't
     * been paid out.
     */
    function getTotalPaidLoansAmount() constant returns (uint totalLoansAmount) {
        for (uint i = 1; i <= loanIndex; i++) 
        {
            var l = loans[i];
            if(l.isPaidOut() && !l.isRepaid())
            {
                totalLoansAmount += l.amount();
            }
        }
        
        return totalLoansAmount;
    }
    
    /**
     * Get the total amount of interest that has been repaid.
     */
    function getTotalRepaidInterestAmount() constant returns (uint totalInterestAmount) {
        for (uint i = 1; i <= loanIndex; i++) 
        {
            var l = loans[i];
            if(l.isRepaid())
            {
                totalInterestAmount += l.getInterestAmount();
            }
        }
        
        return totalInterestAmount;
    }

    /**
     * Get the total amount of all loans, excluding the ones that haven't
     * been paid out.
     */
    function getTotalRepaidLoansAmount() constant returns (uint totalLoansAmount) {
        for (uint i = 1; i <= loanIndex; i++) 
        {
            var l = loans[i];
            if(l.isRepaid())
            {
                totalLoansAmount += l.getRepaymentAmount();
            }
        }
        
        return totalLoansAmount;
    }
    
    /**
     * Get the current balance of the circle, i.e.:
     * [total deposit amount] - [total loan amount] + [total repaid interest amount]
     */
    function getBalance() constant returns (uint balance) {
        balance = getTotalDepositsAmount() - getTotalActiveLoansAmount() + getTotalRepaidInterestAmount();
        return balance;
    }
    
    /**
     * Returns the balance for a specific member. I.e. [total deposits] - 
     * [total active loans]
     */
    function getMemberBalance(string memberId) constant returns (uint amount){
        uint totalDepositsAmount;
        uint totalLoansAmount;
        
        var memberIdHash = sha3(memberId);
        
        // All deposits of the member contribute to the balance.
        for (uint i = 1; i <= depositIndex; i++) 
        {
            if(deposits[i].memberIdHash == memberIdHash)
                totalDepositsAmount += deposits[i].amount;
        }
        
        // Loans that have not been repaid are subtracted.
        for (uint j = 1; j <= loanIndex; j++) 
        {
            Loan l = loans[j];
            
            if(l.userIdHash() == memberIdHash && !l.isRepaid())
                totalLoansAmount += loans[j].amount();
        }
        
        // TODO: Add dividends, withdrawals

        amount = totalDepositsAmount - totalLoansAmount;
        return amount;
    }

}
     