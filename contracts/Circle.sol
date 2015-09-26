/**
 * A loan taken out of a circle.
 */
contract Loan {
    /**
     * The amount that was loaned, in pence GBP.
     */
    uint public amount;

    /**
     * The MoneyCircles userId that took out the loan. The userId is
     * the ID as present in the MoneyCircles database.
     */
    string public userId;

    /**
     * The Circle that this loan was taken out from.
     */
    address public circle;

    /**
     * The BitReserve transaction ID where this loan was payed out.
     */
    string public payoutTransactionId;

    // How to check whether a string is null or empty? Using a == ""
    // is not allowed by the compiler (sees "" as bytes0)
    bool public isPaidOut;

    /**
     * The BitReserve transaction ID where this loan was payed repaid.
     */
    string public repaymentTransactionId;

    bool public isRepaid;

    /**
     * Confirm that the loan has been paid out by referring to the BitReserve
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
     * Confirm that the loan has been repaid by referring to the BitReserve
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

    function Loan(string newUserid, uint newAmount) {
        userId = newUserid;
        amount = newAmount;
        // We store the sender of the message as the circle address.
        // This adds some form of security: if anyone else would create a
        // Loan, and the address would not be from a Circle contract, that
        // Loan is not considered valid.
        circle = msg.sender;
    }
}

/**
 * A single Money Circle. The entry contract for all properties.
 */
contract Circle {
    string public name;
    string public commonBond;
    address public creator;

    function Circle(string newName, string newCommonBond){
        name = newName;
        commonBond = newCommonBond;
        creator = msg.sender;
    }

    struct Member {
        string id;
        string username;
    }
    
    struct Deposit {
        string memberId;
        uint amount;
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

    function createLoan(string memberId, uint amount) returns (Loan l) {
        if(msg.sender != creator)
            return;

        // Only allow loans by members.
        if(memberIndexByIdHash[sha3(memberId)] == 0)
           return;
           
        // TODO: add checks to see if the loan is allowed. E.g. loan
        // balance, credit scoring, ...

        loanIndex++;

        l = new Loan(memberId, amount);
        loans[loanIndex] = l;

        return l;
    }

    /**
     * Confirm that the loan has been paid out by referring to the BitReserve
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
     * Confirm that the loan has been repaid by referring to the BitReserve
     * transaction in which it was paid.
     */
    function setRepaid(Loan l, string bitReserveTxId) {
        if(msg.sender != creator)
            return;

        // Check if this loan is ours. Note that the Loan does this too.
        // TODO

        l.setRepaid(bitReserveTxId);
    }
    
    /**
     * Register a deposit of a member.
     */
    function createDeposit(string memberId, uint amount) {
         if(msg.sender != creator)
            return;

        // Only allow loans by members.
        if(memberIndexByIdHash[sha3(memberId)] == 0)
           return;

        depositIndex++;

        Deposit d = deposits[depositIndex];
        d.memberId = memberId;
        d.amount = amount;
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
    function getTotalDepositsAmount() returns (uint totalDepositsAmount) {
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
     * Get the total outstanding amount of all loans.
     */
    function getTotalOutstandingLoansAmount() returns (uint totalLoansAmount) {
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
     * Get the current balance of the circle, i.e.:
     * [total deposit amount] - [total loan amount]
     */
    function getBalance() returns (uint balance) {
        balance = getTotalDepositsAmount() - getTotalOutstandingLoansAmount();
        return balance;
    }
}
       