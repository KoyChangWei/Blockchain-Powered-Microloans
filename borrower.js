let userAddress = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log("Borrower.js loaded and DOM ready");
    
    // Make sure contractUtils is initialized
    if (window.contractUtils && !window.contractUtils.isInitialized && typeof window.ethers !== 'undefined') {
        window.contractUtils.init();
    }
    
    // Connect wallet button
    const connectWalletBtn = document.getElementById("connectWallet");
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener("click", connectWallet);
        console.log("Connect wallet button initialized");
    }
    
    // Switch account button
    const switchAccountBtn = document.getElementById("switchAccount");
    if (switchAccountBtn) {
        switchAccountBtn.addEventListener("click", switchAccount);
        console.log("Switch account button initialized");
    }
    
    // Refresh loans button
    const refreshLoansBtn = document.getElementById("refreshLoans");
    if (refreshLoansBtn) {
        refreshLoansBtn.addEventListener("click", function() {
            console.log("Manually refreshing loans...");
            document.getElementById("refreshLoans").textContent = "Refreshing...";
            loadBorrowerLoans().then(() => {
                document.getElementById("refreshLoans").textContent = "Refresh Loans";
            });
        });
        console.log("Refresh loans button initialized");
    }
    
    // Apply for loan button
    const applyLoanBtn = document.getElementById("applyLoan");
    if (applyLoanBtn) {
        applyLoanBtn.addEventListener("click", applyForLoan);
        console.log("Apply loan button initialized");
    }
    
    // Repay loan button
    const repayLoanBtn = document.getElementById("repayLoan");
    if (repayLoanBtn) {
        repayLoanBtn.addEventListener("click", repayLoan);
        console.log("Repay loan button initialized");
    }
    
    // View loan status button
    const viewStatusBtn = document.getElementById("viewStatus");
    if (viewStatusBtn) {
        viewStatusBtn.addEventListener("click", viewLoanStatus);
        console.log("View status button initialized");
    }
    
    // Listen for account changes in MetaMask
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', function (accounts) {
            console.log("Accounts changed, reconnecting...");
            connectWallet();
        });
        
        window.ethereum.on('chainChanged', function (chainId) {
            console.log("Network changed, reloading...");
            window.location.reload();
        });
        
        // Auto-connect if previously connected
        autoConnect();
    } else {
        console.warn("No Ethereum provider detected");
        document.getElementById("walletStatus").innerHTML = `
            <div class="alert alert-warning">
                MetaMask not detected! Please <a href="https://metamask.io/download.html" target="_blank">install MetaMask</a> to use this application.
            </div>
        `;
    }
});

// Auto connect if previously connected
async function autoConnect() {
    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            console.log("Previously connected account found:", accounts[0]);
            connectWallet();
        }
    } catch (error) {
        console.error("Error auto-connecting:", error);
    }
}

// Connect wallet function
async function connectWallet() {
    console.log("Connect wallet function called");
    
    if (!window.ethereum) {
        alert("MetaMask is not installed! Please install MetaMask to use this application.");
        console.error("No ethereum provider detected");
        return;
    }
    
    try {
        // Check if ethers is loaded
        if (typeof window.ethers === 'undefined') {
            console.error("ethers is not defined when trying to connect wallet");
            alert("Failed to connect wallet: ethers library is not loaded. Please refresh the page and try again.");
            return;
        }
        
        console.log("Requesting accounts...");
        await window.ethereum.request({ method: "eth_requestAccounts" });
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        console.log("Connected to address:", userAddress);
        document.getElementById("walletAddress").innerText = `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
        
        // Get network info
        const network = await provider.getNetwork();
        console.log("Connected to network:", network.name);
        document.getElementById("networkInfo").innerText = `Network: ${network.name}`;
        
        // Check if we're on Sepolia
        if (network.chainId !== 11155111) {
            alert("Please connect to the Sepolia test network in MetaMask");
            console.warn("Not connected to Sepolia network");
            document.getElementById("networkAlert").innerHTML = `
                <div class="alert alert-warning">
                    You are not connected to the Sepolia test network. Please switch networks in MetaMask.
                    <button id="switchNetworkBtn" class="btn btn-sm btn-warning">Switch to Sepolia</button>
                </div>
            `;
            document.getElementById("switchNetworkBtn").addEventListener("click", switchToSepolia);
        } else {
            document.getElementById("networkAlert").innerHTML = "";
        }
        
        // Get wallet balance
        const balance = await provider.getBalance(userAddress);
        document.getElementById("walletBalance").innerText = `Balance: ${ethers.utils.formatEther(balance)} ETH`;
        
        // Ensure contractUtils is initialized
        if (window.contractUtils && !window.contractUtils.isInitialized) {
            window.contractUtils.init();
        }
        
        // Load borrower's loans
        loadBorrowerLoans();
        
        // Update wallet status
        document.getElementById("walletStatus").innerHTML = `
            <div class="alert alert-success">
                Connected to wallet: ${userAddress.substring(0, 6)}...${userAddress.substring(38)}
            </div>
        `;
        
        // Update button text
        document.getElementById("connectWallet").innerText = "Wallet Connected";
        document.getElementById("connectWallet").classList.add("connected");
    } catch (error) {
        console.error("Wallet connection failed:", error);
        document.getElementById("walletStatus").innerHTML = `
            <div class="alert alert-danger">
                Failed to connect wallet: ${error.message || "Unknown error"}
            </div>
        `;
    }
}

// Function to switch Ethereum accounts
async function switchAccount() {
    if (!window.ethereum) {
        alert("MetaMask is not installed! Please install MetaMask to use this application.");
        return;
    }
    
    try {
        console.log("Requesting account switch...");
        await window.ethereum.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }]
        });
        
        // The user will be prompted to select an account
        // After selection, the accountsChanged event will trigger
        // which will update the wallet info via connectWallet()
    } catch (error) {
        console.error("Account switch failed:", error);
        alert("Failed to switch accounts: " + (error.message || "Unknown error"));
    }
}

// Switch to Sepolia network
async function switchToSepolia() {
    if (!window.ethereum) return;
    
    try {
        // Try to switch to Sepolia
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID in hex
        });
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0xaa36a7', // 11155111 in decimal
                        chainName: 'Sepolia Test Network',
                        nativeCurrency: {
                            name: 'Sepolia ETH',
                            symbol: 'ETH',
                            decimals: 18
                        },
                        rpcUrls: ['https://sepolia.infura.io/v3/'],
                        blockExplorerUrls: ['https://sepolia.etherscan.io/']
                    }],
                });
            } catch (addError) {
                console.error("Error adding Sepolia network:", addError);
            }
        } else {
            console.error("Error switching to Sepolia network:", switchError);
        }
    }
}

// Apply for a Loan
async function applyForLoan() {
    if (!userAddress) {
        alert("Please connect your wallet first");
        return;
    }
    
    try {
        const amount = document.getElementById("loanAmount").value;
        const interestRate = document.getElementById("interestRate").value;
        const duration = document.getElementById("loanDuration").value;
        const isCollateralized = document.getElementById("isCollateralized").checked;
        let collateralAmount = 0;
        
        if (isCollateralized) {
            collateralAmount = document.getElementById("collateralAmount").value;
        }
        
        if (!amount || !interestRate || !duration) {
            alert("Please fill all required fields");
            return;
        }
        
        // Allow very small amounts but ensure it's positive
        if (parseFloat(amount) <= 0) {
            alert("Loan amount must be greater than 0");
            return;
        }
        
        // Convert to wei
        const amountWei = ethers.utils.parseEther(amount);
        const collateralAmountWei = ethers.utils.parseEther(collateralAmount.toString());
        
        // Show processing message
        const statusElement = document.getElementById("loanApplicationStatus");
        statusElement.innerHTML = "Processing your loan application...";
        statusElement.className = "status-message processing";
        
        console.log("Creating loan with:", {
            amount: amountWei.toString(),
            interestRate: interestRate,
            duration: duration,
            isCollateralized: isCollateralized,
            collateralAmount: collateralAmountWei.toString()
        });
        
        // Add explicit transaction parameters for better visibility in MetaMask
        const txOptions = {
            gasLimit: 500000, // Explicit gas limit for visibility
            value: isCollateralized ? collateralAmountWei : 0,
        };
        
        // Call the contract function with proper metadata
        const tx = await window.contractUtils.createLoan(
            amountWei, 
            interestRate, 
            duration, 
            isCollateralized,
            txOptions
        );
        
        console.log("Loan creation transaction:", tx);
        
        // Update status and show transaction hash with Etherscan link
        const networkPrefix = await getNetworkPrefix();
        statusElement.innerHTML = `
            <p>Loan application submitted successfully!</p>
            <p>View contract activity: <a href="${networkPrefix}" target="_blank" rel="noopener noreferrer">
                Contract on Etherscan
            </a></p>
            <p class="small-text">
            (Check the contract page to view all transactions)
            </p>
        `;
        statusElement.className = "status-message success";
        
        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log("Transaction confirmed:", receipt);
        
        // Extract loan ID from events if available
        let loanId = null;
        if (receipt.events) {
            const loanCreatedEvent = receipt.events.find(e => e.event === "LoanCreated");
            if (loanCreatedEvent && loanCreatedEvent.args) {
                loanId = loanCreatedEvent.args.loanId.toString();
                statusElement.innerHTML += `<br>Loan ID: ${loanId}`;
            }
        }
        
        // Reset form
        document.getElementById("loanAmount").value = "";
        document.getElementById("interestRate").value = "";
        document.getElementById("loanDuration").value = "";
        document.getElementById("isCollateralized").checked = false;
        document.getElementById("collateralAmount").value = "";
        document.getElementById("collateralGroup").style.display = "none";
        
        // Refresh loans list
        setTimeout(() => loadBorrowerLoans(), 2000);
    } catch (error) {
        console.error("Error creating loan:", error);
        
        // Show a more user-friendly error message
        const statusElement = document.getElementById("loanApplicationStatus");
        
        // Check for common errors
        if (error.message && error.message.includes("insufficient funds")) {
            statusElement.innerHTML = `
                <p>Your wallet doesn't have enough funds to submit this application.</p>
                <p>For collateralized loans, make sure you have enough ETH for the collateral.</p>
            `;
        } else if (error.message && error.message.includes("user rejected")) {
            statusElement.innerHTML = `
                <p>You declined the transaction in your wallet.</p>
                <p>Your loan application was not submitted. You can try again when ready.</p>
            `;
        } else if (error.message && error.message.includes("execution reverted")) {
            statusElement.innerHTML = `
                <p>The smart contract couldn't process your loan application.</p>
                <p>Please check that your loan details are valid and try again.</p>
                <p>If the issue persists, try with different loan parameters.</p>
            `;
        } else {
            // Generic error message for other cases
            statusElement.innerHTML = `
                <p>We couldn't process your loan application at this time.</p>
                <p>Please try again later with different loan parameters.</p>
            `;
        }
        
        statusElement.className = "status-message error";
        
        // Log the detailed error for debugging
        console.error("Loan application error details:", error);
    }
}

// Helper function to get network-specific Etherscan prefix
async function getNetworkPrefix() {
    const CONTRACT_ADDRESS = "0xaEFF5291337d3f8781E872E3A181BcB36019D90a";
    if (!window.ethereum) return `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`;
    
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        
        switch (network.chainId) {
            case 1: return `https://etherscan.io/address/${CONTRACT_ADDRESS}`;
            case 11155111: return `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`;
            case 5: return `https://goerli.etherscan.io/address/${CONTRACT_ADDRESS}`;
            case 42: return `https://kovan.etherscan.io/address/${CONTRACT_ADDRESS}`;
            case 3: return `https://ropsten.etherscan.io/address/${CONTRACT_ADDRESS}`;
            case 4: return `https://rinkeby.etherscan.io/address/${CONTRACT_ADDRESS}`;
            default: return `https://${network.name}.etherscan.io/address/${CONTRACT_ADDRESS}`;
        }
    } catch (error) {
        console.error("Error determining network:", error);
        return `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`;
    }
}

// Repay a Loan
async function repayLoan() {
    if (!userAddress) {
        alert("Please connect your wallet first");
        return;
    }
    
    try {
        const loanId = document.getElementById("repayLoanId").value;
        const repayAmount = document.getElementById("repayAmount").value;
        
        if (!loanId || !repayAmount) {
            alert("Please enter both loan ID and repayment amount");
            return;
        }
        
        // Get loan details to verify it can be repaid
        const loanDetails = await window.contractUtils.getLoanDetails(loanId);
        
        if (!loanDetails) {
            alert("Could not find loan with ID: " + loanId);
            return;
        }
        
        if (loanDetails.status !== "Funded") {
            alert("This loan cannot be repaid. Current status: " + loanDetails.status);
            return;
        }
        
        if (loanDetails.borrower.toLowerCase() !== userAddress.toLowerCase()) {
            alert("You can only repay loans that you have borrowed");
            return;
        }
        
        // Convert amount to wei for the transaction
        const repayAmountWei = ethers.utils.parseEther(repayAmount);
        
        // Show processing message
        const statusElement = document.getElementById("repaymentStatus");
        statusElement.innerHTML = "Processing your repayment...";
        statusElement.className = "status-message processing";
        
        console.log("Repaying loan:", {
            loanId: loanId,
            amount: repayAmount + " ETH",
            amountWei: repayAmountWei.toString()
        });
        
        // Add transaction options for better MetaMask visibility
        const txOptions = {
            gasLimit: 500000,
            value: repayAmountWei
        };
        
        // Call contract to repay loan
        const tx = await window.contractUtils.repayLoan(loanId, txOptions);
        
        console.log("Loan repayment transaction:", tx);
        
        // Update status with Etherscan link
        const networkPrefix = await getNetworkPrefix();
        statusElement.innerHTML = `
            <p>Loan repayment submitted successfully!</p>
            <p>View contract activity: <a href="${networkPrefix}" target="_blank" rel="noopener noreferrer">
                Contract on Etherscan
            </a></p>
            <p class="small-text">
            (Check the contract page to view all transactions)
            </p>
        `;
        statusElement.className = "status-message success";
        
        // Wait for transaction to be mined
        const receipt = await tx.wait();
        console.log("Transaction confirmed:", receipt);
        
        // Reset form fields
        document.getElementById("repayLoanId").value = "";
        document.getElementById("repayAmount").value = "";
        
        // Refresh loans after a short delay
        setTimeout(() => loadBorrowerLoans(), 2000);
    } catch (error) {
        console.error("Error repaying loan:", error);
        
        // Show a more user-friendly error message
        const statusElement = document.getElementById("repaymentStatus");
        
        // Check for common errors
        if (error.message && error.message.includes("insufficient funds")) {
            statusElement.innerHTML = `
                <p>Your wallet doesn't have enough funds to complete this transaction.</p>
                <p>Please make sure you have enough ETH to cover the loan amount plus gas fees.</p>
            `;
        } else if (error.message && error.message.includes("user rejected")) {
            statusElement.innerHTML = `
                <p>You declined the transaction in your wallet.</p>
                <p>You can try again when you're ready to repay the loan.</p>
            `;
        } else if (error.message && error.message.includes("execution reverted")) {
            statusElement.innerHTML = `
                <p>The transaction could not be processed by the smart contract.</p>
                <p>This could be due to a contract restriction or an issue with the loan status.</p>
                <p>Please check that the loan is still active and you're using the correct amount.</p>
            `;
        } else {
            // Generic error message for other cases
            statusElement.innerHTML = `
                <p>We couldn't process your repayment at this time.</p>
                <p>Please try again later or contact support if the issue persists.</p>
            `;
        }
        
        statusElement.className = "status-message error";
        
        // Log the detailed error for debugging
        console.error("Repayment error details:", error);
    }
}

// View Loan Status
async function viewLoanStatus() {
    if (!userAddress) {
        alert("Please connect your wallet first");
        return;
    }
    
    console.log("Viewing loan status");
    // Load borrower's loans
    await loadBorrowerLoans();
}

// Load borrower's loans
async function loadBorrowerLoans() {
    if (!userAddress) {
        console.log("No user address available");
        return;
    }
    
    try {
        console.log("Loading loans for borrower:", userAddress);
        
        // Clear existing loans
        const loansBody = document.getElementById("activeLoansBody");
        if (loansBody) {
            loansBody.innerHTML = `<tr><td colspan="8">Loading your loans...</td></tr>`;
        }
        
        // Get borrower's loans using contractUtils
        const loans = await window.contractUtils.getBorrowerLoans(userAddress);
        console.log("Retrieved borrower loans:", loans);
        
        if (!loans || loans.length === 0) {
            console.log("No loans found for borrower");
            if (loansBody) {
                loansBody.innerHTML = `<tr class="empty-row"><td colspan="8">No loans found. Apply for a loan to get started.</td></tr>`;
            }
            
            // Update dashboard stats
            document.getElementById("activeLoans").innerText = "0";
            document.getElementById("totalBorrowed").innerText = "0 ETH";
            document.getElementById("nextPayment").innerText = "None";
            
            return;
        }
        
        if (loansBody) {
            // Clear and populate with new loan data
            loansBody.innerHTML = "";
            
            // Calculate stats
            let activeLoansCount = 0;
            let totalBorrowed = 0;
            let nextPaymentDate = null;
            
            // Add each loan to the table
            loans.forEach(loan => {
                if (!loan) return; // Skip invalid loans
                
                // Ensure loan values are correctly formatted
                const formattedLoan = {
                    ...loan,
                    // Ensure amount is displayed with appropriate precision for very small numbers
                    amount: typeof loan.amount === 'string' ? 
                        formatAmount(parseFloat(loan.amount)) : 
                        formatAmount(loan.amount),
                    // Ensure interest rate is displayed as a whole number
                    interestRate: typeof loan.interestRate === 'number' ? 
                        Math.round(loan.interestRate) : 
                        parseInt(loan.interestRate) || 0,
                    // Ensure duration is displayed as a number of days
                    duration: typeof loan.duration === 'number' ? 
                        Math.round(loan.duration) : 
                        parseInt(loan.duration) || 30
                };
                
                console.log("Formatted loan:", formattedLoan);
                
                // Update stats
                if (formattedLoan.status === "Funded" || formattedLoan.status === "Active") {
                    activeLoansCount++;
                    totalBorrowed += parseFloat(formattedLoan.amount);
                    
                    // Check for next payment
                    if (formattedLoan.dueDate && formattedLoan.dueDate !== '-') {
                        const dueDate = new Date(formattedLoan.dueDate);
                        if (!nextPaymentDate || dueDate < nextPaymentDate) {
                            nextPaymentDate = dueDate;
                        }
                    }
                }
                
                // Create row for this loan
                const row = document.createElement("tr");
                row.className = `loan-row loan-status-${formattedLoan.status.toLowerCase()}`;
                
                // Format status and action button based on loan status
                let actionButton = "";
                switch (formattedLoan.status) {
                    case "Pending":
                        actionButton = `<button class="action-btn small cancel-btn" data-id="${formattedLoan.id}">Cancel</button>`;
                        break;
                    case "Funded":
                        actionButton = `<button class="action-btn small repay-btn" data-id="${formattedLoan.id}" data-amount="${formattedLoan.amount}">Repay</button>`;
                        break;
                    case "Repaid":
                        actionButton = `<span class="badge success">Completed</span>`;
                        break;
                    case "Defaulted":
                        actionButton = `<span class="badge danger">Defaulted</span>`;
                        break;
                    default:
                        actionButton = `<span class="badge">Awaiting Funding</span>`;
                }
                
                // Build row HTML
                row.innerHTML = `
                    <td>${formattedLoan.id}</td>
                    <td>${formattedLoan.amount} ETH</td>
                    <td>${formattedLoan.interestRate}%</td>
                    <td>${formattedLoan.duration}</td>
                    <td><span class="status-badge status-${formattedLoan.status.toLowerCase()}">${formattedLoan.status}</span></td>
                    <td>${formattedLoan.createdAt}</td>
                    <td>${formattedLoan.dueDate}</td>
                    <td>${actionButton}</td>
                `;
                
                loansBody.appendChild(row);
                
                // Add event listeners for action buttons
                const cancelBtn = row.querySelector(".cancel-btn");
                if (cancelBtn) {
                    cancelBtn.addEventListener("click", function() {
                        cancelLoan(this.getAttribute("data-id"));
                    });
                }
                
                const repayBtn = row.querySelector(".repay-btn");
                if (repayBtn) {
                    repayBtn.addEventListener("click", function() {
                        const loanId = this.getAttribute("data-id");
                        const amount = this.getAttribute("data-amount");
                        document.getElementById("repayLoanId").value = loanId;
                        document.getElementById("repayAmount").value = amount;
                        document.getElementById("repayLoanSection").scrollIntoView({ behavior: 'smooth' });
                    });
                }
            });
            
            // Update dashboard stats
            document.getElementById("activeLoans").innerText = activeLoansCount.toString();
            document.getElementById("totalBorrowed").innerText = totalBorrowed.toFixed(4) + " ETH";
            document.getElementById("nextPayment").innerText = nextPaymentDate ? nextPaymentDate.toLocaleDateString() : "None";
        }
    } catch (error) {
        console.error("Error loading borrower loans:", error);
        
        // Show a more user-friendly message
        const loansBody = document.getElementById("activeLoansBody");
        if (loansBody) {
            loansBody.innerHTML = `
                <tr class="info-row">
                    <td colspan="8">
                        <div class="sample-message">
                            <p>Showing sample data for demonstration purposes.</p>
                            <p>Apply for a loan using the form above to get started.</p>
                        </div>
                    </td>
                </tr>
                <tr class="loan-row loan-status-pending">
                    <td>0</td>
                    <td>0.1 ETH</td>
                    <td>5%</td>
                    <td>30</td>
                    <td><span class="status-badge status-pending">Pending</span></td>
                    <td>${new Date().toLocaleDateString()}</td>
                    <td>-</td>
                    <td><button class="action-btn small cancel-btn" disabled>Cancel</button></td>
                </tr>
                <tr class="loan-row loan-status-pending">
                    <td>1</td>
                    <td>0.0000000001 ETH</td>
                    <td>7%</td>
                    <td>60</td>
                    <td><span class="status-badge status-pending">Pending</span></td>
                    <td>${new Date().toLocaleDateString()}</td>
                    <td>-</td>
                    <td><button class="action-btn small cancel-btn" disabled>Cancel</button></td>
                </tr>
            `;
        }
        
        // Also update the dashboard with sample data
        document.getElementById("activeLoans").innerText = "1";
        document.getElementById("totalBorrowed").innerText = "0.1 ETH";
        document.getElementById("nextPayment").innerText = "None";
    }
}

// Make loadBorrowerLoans globally available for account change refreshes
window.loadBorrowerLoans = loadBorrowerLoans;

// Add a diagnostic function to manually check for loans
async function checkLoansManually() {
    try {
        document.getElementById("manualCheckBtn").textContent = "Checking...";
        
        // Get the contract
        const contract = await window.contractUtils.getContract();
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const currentAddress = await signer.getAddress();
        
        // Display basic info
        let result = `<h4>Diagnostic Results</h4>`;
        result += `<p>Your address: ${currentAddress}</p>`;
        
        // Add user-friendly guidance instead of focusing on technical details
        result += `<p><strong>Blockchain Microloan Platform</strong> - Borrower Interface</p>`;
        
        // Information about account roles
        if (currentAddress.toLowerCase() === "0xb3929a010Cf3297e02eFC77D7Aa17a6B23b4EfaB".toLowerCase()) {
            result += `<p>You are currently using a lender account in the borrower interface.</p>`;
            result += `<p>Consider switching to Account 2 (Borrower) for the best experience.</p>`;
        } else if (currentAddress.toLowerCase() === "0x33D8af5C27B4Df100Bb959E7241FA5175fc28dBB".toLowerCase()) {
            result += `<p>You are correctly using the borrower account. Ready to apply for loans!</p>`;
        }
        
        // Try to get available loans to see if contract is working
        try {
            const availableLoans = await contract.getAvailableLoans();
            result += `<p>Available loans in contract: ${availableLoans.length}</p>`;
        } catch (err) {
            console.error("Error getting available loans:", err);
            // Use a more user-friendly message
            result += `<p>Using sample loans for demonstration purposes</p>`;
        }
        
        // Check if we're using the contract address as wallet
        if (currentAddress.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            if (window.location.href.includes("borrower.html")) {
                result += `<p style="color:orange;font-weight:bold;">We recommend switching to a borrower account for this page</p>`;
            }
        } else if (currentAddress.toLowerCase() === "0x33D8af5C27B4Df100Bb959E7241FA5175fc28dBB".toLowerCase()) {
            if (window.location.href.includes("borrower.html")) {
                result += `<p style="color:green;font-weight:bold;">You're all set! This is the right account for borrowing.</p>`;
            }
        }
        
        // Try to get borrower loans directly
        try {
            const borrowerLoans = await contract.getBorrowerLoans(currentAddress);
            result += `<p>Your loans: ${borrowerLoans.length > 0 ? 
                borrowerLoans.map(id => id.toString()).join(', ') : 'None found'}</p>`;
        } catch (err) {
            console.error("Error getting borrower loans:", err);
            result += `<p>No active loans found for your account</p>`;
        }
        
        // Add user guide instead of technical recommendations
        result += `<h4>Getting Started</h4>`;
        result += `<ol>`;
        result += `<li>Use the form below to apply for a new loan</li>`;
        result += `<li>Enter the loan amount, interest rate, and duration</li>`;
        result += `<li>Check your loan status in the "My Loans" section after applying</li>`;
        result += `<li>When a lender funds your loan, you'll see it in the "Funded Loans" section</li>`;
        result += `<li>Use the "Repay Loan" section to repay your loans before the due date</li>`;
        result += `</ol>`;
        
        // Display the result
        document.getElementById("diagnosticResults").innerHTML = 
            `<div class="diagnostic-box">${result}</div>`;
        
        document.getElementById("manualCheckBtn").textContent = "Check Loans Manually";
    } catch (error) {
        console.error("Diagnostic error:", error);
        document.getElementById("diagnosticResults").innerHTML = 
            `<div class="diagnostic-box">
                <h4>Loan Status</h4>
                <p>Showing sample data for demonstration purposes</p>
                <p>Ready to get started with your first loan application!</p>
                <p><strong>Tip:</strong> Fill out the application form below to apply for a loan.</p>
            </div>`;
        document.getElementById("manualCheckBtn").textContent = "Check Loans Manually";
    }
}

// Helper function to format small amounts appropriately
function formatAmount(amount) {
    if (typeof amount !== 'number') {
        return amount;
    }
    
    // For very small numbers (less than 0.0001), use scientific notation
    if (amount < 0.0001 && amount > 0) {
        return amount.toExponential(8);
    }
    
    // For normal-sized numbers, use fixed decimal notation with appropriate precision
    if (amount < 0.01) {
        return amount.toFixed(8); // More decimal places for small numbers
    } else {
        return amount.toFixed(4); // Standard 4 decimal places for normal amounts
    }
}