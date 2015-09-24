contract Loan {
    uint public amount;
    uint public userId;
    address public circleAddress;

    function Loan(uint newUserid, uint newAmount) {
        userId = newUserid;
        amount = newAmount;
        circleAddress = msg.sender;
    }
}

contract Circle {
    string public name;
    string public commonBond;

    function Circle(string newName, string newCommonBond){
        name = newName;
        commonBond = newCommonBond;
    }

    struct Member{
        uint id;
        string username;
    }
    
    mapping(uint => Member) public members;
    uint public numMembers;
    
    mapping(uint => Loan) public activeLoans;
    uint public numLoans;

    function addMember(uint id, string userName) {
        Member m = members[numMembers++];
        m.id = id;
        m.username = userName;
    }

    function addNumLoans(uint memberId, uint amount) {
    }
    
    function createLoan(uint memberId, uint amount) returns (Loan l) {
        l = new Loan(memberId, amount);
        activeLoans[numLoans++] = l;
        return l;
    }
}

contract LoanTester {
    address public loanAddress;
    
    function createLoan(uint memberId, uint amount) returns (Loan l) {
        l = new Loan(memberId, amount);
        loanAddress = l;
        return l;
    }
    
    function createLoanNoReturn(uint memberId, uint amount) {
        Loan l = new Loan(memberId, amount);
        loanAddress = l;
    }
}