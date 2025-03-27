// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MicroLoanPlatform
 * @dev A platform for micro loans with borrowers and lenders
 */
contract MicroLoanPlatform {
    // ---- State Variables ----
    address public owner;
    uint256 public platformFeePercent = 1; // 1% platform fee
    uint256 public totalLoanVolume;
    uint256 public activeLoans;
    
    // Loan state
    enum LoanStatus { Pending, Funded, Repaid, Defaulted }
    
    // Loan structure
    struct Loan {
        uint256 id;
        address borrower;
        uint256 amount;
        uint256 interestRate; // in percentage points (e.g., 5 for 5%)
        uint256 duration; // in days
        uint256 createdAt;
        uint256 fundedAt;
        uint256 dueDate;
        LoanStatus status;
        address lender;
        bool isCollateralized;
        uint256 collateralAmount;
    }
    
    // Mapping from loan ID to Loan
    mapping(uint256 => Loan) public loans;
    
    // User loan tracking
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;
    
    // Platform statistics
    uint256 public totalInterestPaid;
    uint256 public totalLoansCreated;
    uint256 public totalLoansCompleted;
    
    // ---- Events ----
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 interestRate, uint256 duration);
    event LoanFunded(uint256 indexed loanId, address indexed lender, uint256 amount);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower);
    event CollateralClaimed(uint256 indexed loanId, address indexed lender, uint256 amount);
    event PlatformFeeCollected(uint256 amount);
    
    // ---- Constructor ----
    constructor() {
        owner = msg.sender;
    }
    
    // ---- Modifiers ----
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyBorrower(uint256 _loanId) {
        require(loans[_loanId].borrower == msg.sender, "Only the borrower can call this function");
        _;
    }
    
    modifier onlyLender(uint256 _loanId) {
        require(loans[_loanId].lender == msg.sender, "Only the lender can call this function");
        _;
    }
    
    // ---- Core Functions ----
    
    /**
     * @dev Create a loan request
     * @param _amount Loan amount in wei
     * @param _interestRate Interest rate in percentage points
     * @param _duration Loan duration in days
     * @param _isCollateralized Whether the loan requires collateral
     */
    function createLoan(
        uint256 _amount,
        uint256 _interestRate,
        uint256 _duration,
        bool _isCollateralized
    ) external payable returns (uint256) {
        require(_amount > 0, "Loan amount must be greater than 0");
        require(_interestRate > 0, "Interest rate must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        
        // If collateralized, check collateral amount
        uint256 collateralAmount = 0;
        if (_isCollateralized) {
            collateralAmount = msg.value;
            require(collateralAmount >= _amount / 2, "Collateral must be at least 50% of loan amount");
        }
        
        uint256 loanId = totalLoansCreated;
        
        loans[loanId] = Loan({
            id: loanId,
            borrower: msg.sender,
            amount: _amount,
            interestRate: _interestRate,
            duration: _duration,
            createdAt: block.timestamp,
            fundedAt: 0,
            dueDate: 0,
            status: LoanStatus.Pending,
            lender: address(0),
            isCollateralized: _isCollateralized,
            collateralAmount: collateralAmount
        });
        
        borrowerLoans[msg.sender].push(loanId);
        totalLoansCreated++;
        activeLoans++;
        
        emit LoanCreated(loanId, msg.sender, _amount, _interestRate, _duration);
        return loanId;
    }
    
    /**
     * @dev Fund a loan
     * @param _loanId ID of the loan to fund
     */
    function fundLoan(uint256 _loanId) external payable {
        Loan storage loan = loans[_loanId];
        
        require(loan.borrower != address(0), "Loan does not exist");
        require(loan.status == LoanStatus.Pending, "Loan is not available for funding");
        require(msg.value == loan.amount, "Incorrect funding amount");
        require(loan.borrower != msg.sender, "Cannot fund your own loan");
        
        loan.lender = msg.sender;
        loan.status = LoanStatus.Funded;
        loan.fundedAt = block.timestamp;
        loan.dueDate = block.timestamp + (loan.duration * 1 days);
        
        lenderLoans[msg.sender].push(_loanId);
        totalLoanVolume += loan.amount;
        
        // Transfer funds to borrower
        payable(loan.borrower).transfer(loan.amount);
        
        emit LoanFunded(_loanId, msg.sender, loan.amount);
    }
    
    /**
     * @dev Repay a loan with interest
     * @param _loanId ID of the loan to repay
     */
    function repayLoan(uint256 _loanId) external payable onlyBorrower(_loanId) {
        Loan storage loan = loans[_loanId];
        
        require(loan.status == LoanStatus.Funded, "Loan is not in funded state");
        
        // Calculate total repayment (principal + interest)
        uint256 interest = (loan.amount * loan.interestRate) / 100;
        uint256 totalRepayment = loan.amount + interest;
        require(msg.value == totalRepayment, "Incorrect repayment amount");
        
        loan.status = LoanStatus.Repaid;
        activeLoans--;
        totalLoansCompleted++;
        totalInterestPaid += interest;
        
        // Calculate platform fee
        uint256 platformFee = (interest * platformFeePercent) / 100;
        uint256 lenderAmount = totalRepayment - platformFee;
        
        // Return collateral to borrower if loan was collateralized
        if (loan.isCollateralized) {
            payable(loan.borrower).transfer(loan.collateralAmount);
        }
        
        // Transfer funds to lender minus platform fee
        payable(loan.lender).transfer(lenderAmount);
        
        // Platform fee goes to contract owner
        payable(owner).transfer(platformFee);
        
        emit LoanRepaid(_loanId, msg.sender, totalRepayment);
        emit PlatformFeeCollected(platformFee);
    }
    
    /**
     * @dev Mark loan as defaulted and handle collateral if applicable
     * @param _loanId ID of the loan to mark as defaulted
     */
    function markAsDefaulted(uint256 _loanId) external onlyLender(_loanId) {
        Loan storage loan = loans[_loanId];
        
        require(loan.status == LoanStatus.Funded, "Loan is not in funded state");
        require(block.timestamp > loan.dueDate, "Loan is not past due date");
        
        loan.status = LoanStatus.Defaulted;
        activeLoans--;
        
        // If collateralized, transfer collateral to lender
        if (loan.isCollateralized && loan.collateralAmount > 0) {
            payable(loan.lender).transfer(loan.collateralAmount);
            emit CollateralClaimed(_loanId, loan.lender, loan.collateralAmount);
        }
        
        emit LoanDefaulted(_loanId, loan.borrower);
    }
    
    // ---- View Functions ----
    
    /**
     * @dev Get all loans created by a borrower
     * @param _borrower Address of the borrower
     * @return Array of loan IDs
     */
    function getBorrowerLoans(address _borrower) external view returns (uint256[] memory) {
        return borrowerLoans[_borrower];
    }
    
    /**
     * @dev Get all loans funded by a lender
     * @param _lender Address of the lender
     * @return Array of loan IDs
     */
    function getLenderLoans(address _lender) external view returns (uint256[] memory) {
        return lenderLoans[_lender];
    }
    
    /**
     * @dev Get detailed information about a loan
     * @param _loanId ID of the loan
     * @return Loan struct with details
     */
    function getLoanDetails(uint256 _loanId) external view returns (Loan memory) {
        return loans[_loanId];
    }
    
    /**
     * @dev Get average interest rate across all loans
     * @return Average interest rate
     */
    function getAverageInterestRate() external view returns (uint256) {
        if (totalLoansCreated == 0) return 0;
        
        uint256 totalInterestRate = 0;
        for (uint256 i = 0; i < totalLoansCreated; i++) {
            totalInterestRate += loans[i].interestRate;
        }
        
        return totalInterestRate / totalLoansCreated;
    }
    
    // ---- Admin Functions ----
    
    /**
     * @dev Update platform fee percentage
     * @param _newFeePercent New fee percentage
     */
    function updatePlatformFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= 5, "Fee cannot exceed 5%");
        platformFeePercent = _newFeePercent;
    }
    
    /**
     * @dev Withdraw ETH from contract (emergency function)
     * @param _amount Amount to withdraw
     */
    function withdrawEther(uint256 _amount) external onlyOwner {
        require(_amount <= address(this).balance, "Insufficient contract balance");
        payable(owner).transfer(_amount);
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param _newOwner Address of the new owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "New owner cannot be the zero address");
        owner = _newOwner;
    }
} 