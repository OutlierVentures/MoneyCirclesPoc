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

    /**
     * The BitReserve transaction ID where this loan was payed repaid.
     */
    string public repaymentTransactionId;

    function setPaidOut(string bitReserveTxId) {
        if(msg.sender != circle)
            return;
        payoutTransactionId = bitReserveTxId;
    }

    function setRepaid(string bitReserveTxId) {
        if(msg.sender != circle)
            return;
         repaymentTransactionId = bitReserveTxId;
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

    mapping(uint => Loan) public activeLoans;
    uint public loanIndex;

    function addMember(string id, string userName) {
        if(msg.sender != creator)
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

        // Check if the user was a member.
        if(memberIndexByIdHash[sha3(memberId)] == 0)
            return;

        loanIndex++;

        l = new Loan(memberId, amount);
        activeLoans[loanIndex] = l;

        return l;
    }

    function setPaidOut(Loan l, string bitReserveTxId) {
        if(msg.sender != creator)
            return;

        // Check if this loan is ours. Note that the Loan does this too.
        // TODO

        l.setPaidOut(bitReserveTxId);
    }

    function setRepaid(Loan l, string bitReserveTxId) {
        if(msg.sender != creator)
            return;

        // Check if this loan is ours. Note that the Loan does this too.
        // TODO

        l.setRepaid(bitReserveTxId);
    }
}
  
