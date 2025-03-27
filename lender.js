let userAddress = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log("Lender.js loaded and DOM ready");
    
    // Connect wallet button
    document.getElementById("connectWallet").addEventListener("click", connectWallet);
    
    // Switch account button
    const switchAccountBtn = document.getElementById("switchAccount");
    if (switchAccountBtn) {
        switchAccountBtn.addEventListener("click", switchAccount);
        console.log("Switch account button initialized");
    }
    
    // Fund loan button
    document.getElementById("fundLoan").addEventListener("click", fundLoan);
    
    // View funded loans button
    document.getElementById("viewFunded").addEventListener("click", viewFundedLoans);
    
    // Refresh available loans button
    const refreshLoansBtn = document.getElementById("refreshAvailableLoans");
    if (refreshLoansBtn) {
        refreshLoansBtn.addEventListener("click", function() {
            console.log("Manually refreshing available loans...");
            this.textContent = "Refreshing...";
            loadAvailableLoans().then(() => {
                this.textContent = "Refresh Loans";
            });
        });
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
    }
});

// Connect wallet function
async function connectWallet() {
    console.log("Connect wallet function called");
    
    if (!window.ethereum) {
        alert("MetaMask is not installed! Please install MetaMask to use this application.");
        console.error("No ethereum provider detected");
        return;
    }
    
    try {
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
        }
        
        // Get wallet balance
        const balance = await provider.getBalance(userAddress);
        document.getElementById("walletBalance").innerText = `Balance: ${ethers.utils.formatEther(balance)} ETH`;
        
        // Load available loans
        loadAvailableLoans();
    } catch (error) {
        console.error("Wallet connection failed:", error);
        alert("Failed to connect wallet: " + (error.message || "Unknown error"));
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

// Fund a Loan
async function fundLoan() {
    if (!userAddress) {
        alert("Please connect your wallet first");
        return;
    }
    
    try {
        const loanId = document.getElementById("loanId").value;
        
        if (!loanId) {
            alert("Please enter a loan ID to fund");
            return;
        }
        
        // Get loan details to confirm amount needed
        const loanDetails = await window.contractUtils.getLoanDetails(loanId);
        
        if (!loanDetails) {
            alert("Could not find loan with ID: " + loanId);
            return;
        }
        
        if (loanDetails.status !== "Active") {
            alert("This loan cannot be funded. Current status: " + loanDetails.status);
            return;
        }
        
        // Format amount for display
        const amountEth = ethers.utils.formatEther(loanDetails.amount);
        
        console.log("Funding loan with ID:", loanId, "Amount:", amountEth, "ETH");
        
        // Show processing status
        const statusElement = document.getElementById("fundingStatus");
        if (statusElement) {
            statusElement.innerHTML = "Processing your funding transaction...";
            statusElement.className = "status-message processing";
        }
        
        // Add explicit transaction parameters for better visibility in MetaMask
        const txOptions = {
            gasLimit: 500000, // Explicit gas limit for visibility
            value: loanDetails.amount, // Send the loan amount as value
        };
        
        // Call the contract function with better metadata
        const tx = await window.contractUtils.fundLoan(loanId, txOptions);
        
        console.log("Loan funding transaction:", tx);
        
        // Update status message with Etherscan link
        const networkPrefix = await getNetworkPrefix();
        if (statusElement) {
            statusElement.innerHTML = `
                <p>Loan funding submitted successfully!</p>
                <p>View contract activity: <a href="${networkPrefix}" target="_blank" rel="noopener noreferrer">
                    Contract on Etherscan
                </a></p>
                <p class="small-text">
                (Check the contract page to view all transactions)
                </p>
            `;
            statusElement.className = "status-message success";
        }
        
        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log("Transaction confirmed:", receipt);
        
        // Reset the input field
        document.getElementById("loanId").value = "";
        
        // Reload loans after transaction confirmation
        await loadAvailableLoans();
        await loadFundedLoans();
    } catch (error) {
        console.error("Error funding loan:", error);
        
        const statusElement = document.getElementById("fundingStatus");
        if (statusElement) {
            statusElement.innerHTML = `Error: ${error.message || "Unknown error occurred"}`;
            statusElement.className = "status-message error";
        }
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

// View Funded Loans
async function viewFundedLoans() {
    if (!userAddress) {
        alert("Please connect your wallet first");
        return;
    }
    
    console.log("Viewing funded loans");
    // Load lender's funded loans
    await loadFundedLoans();
}

// Load available loans
async function loadAvailableLoans() {
    try {
        console.log("Loading available loans for lender view");
        
        // Show loading state
        const loansContainer = document.getElementById("availableLoans");
        if (loansContainer) {
            loansContainer.innerHTML = "<p class='loading-state'>Loading available loans...</p>";
        }
        
        // Get the diagnostic element for more detailed logging
        const diagnosticElement = document.getElementById("diagnosticResults");
        
        // Get available loans from contract
        console.log("Fetching available loans from contract utils");
        const availableLoans = await window.contractUtils.getAvailableLoans();
        
        console.log("Available loans retrieved:", availableLoans);
        
        // Update diagnostic info if element exists
        if (diagnosticElement) {
            diagnosticElement.innerHTML = `
                <div class="diagnostic-section">
                    <p>Available loans retrieval completed</p>
                    <p>Found ${availableLoans.length} loan(s)</p>
                </div>
            `;
        }
        
        // Update UI with loans
        if (loansContainer) {
            if (availableLoans.length === 0) {
                loansContainer.innerHTML = "<p class='empty-state'>No available loans found. Check back later or wait for borrowers to apply for loans.</p>";
                
                // Add sample loan button for testing if in development mode
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    loansContainer.innerHTML += `
                        <div class="dev-tools">
                            <button id="createSampleLoan" class="dev-btn">Create Sample Loan (Dev Mode)</button>
                        </div>
                    `;
                    
                    // Add click handler after a short delay
                    setTimeout(() => {
                        const sampleBtn = document.getElementById("createSampleLoan");
                        if (sampleBtn) {
                            sampleBtn.addEventListener("click", createSampleLoan);
                        }
                    }, 100);
                }
                
                return;
            }
            
            // Clear container for new content
            loansContainer.innerHTML = "";
            
            // Add each loan card to container
            availableLoans.forEach(loan => {
                if (!loan) return; // Skip null loans
                
                const loanElement = document.createElement("div");
                loanElement.className = "loan-item";
                
                // Calculate potential return
                const principal = parseFloat(loan.amount);
                const interest = principal * (parseFloat(loan.interestRate) / 100);
                const totalReturn = principal + interest;
                
                // Format dates
                const createdDate = loan.createdAt || 'Unknown';
                const duration = loan.duration || 30;
                
                // Calculate expected return date
                let dueDate = 'Unknown';
                try {
                    const createdDateObj = new Date(createdDate);
                    createdDateObj.setDate(createdDateObj.getDate() + parseInt(duration));
                    dueDate = createdDateObj.toLocaleDateString();
                } catch (e) {
                    console.warn("Could not calculate due date:", e);
                }
                
                loanElement.innerHTML = `
                    <h3 class="loan-title">Loan #${loan.id}</h3>
                    <div class="loan-details">
                        <div class="loan-detail">
                            <span class="detail-label">Amount:</span>
                            <span class="detail-value">${loan.amount} ETH</span>
                        </div>
                        <div class="loan-detail">
                            <span class="detail-label">Interest Rate:</span>
                            <span class="detail-value highlight">${loan.interestRate}%</span>
                        </div>
                        <div class="loan-detail">
                            <span class="detail-label">Duration:</span>
                            <span class="detail-value">${loan.duration} days</span>
                        </div>
                        <div class="loan-detail">
                            <span class="detail-label">Collateral:</span>
                            <span class="detail-value">${loan.isCollateralized ? `${loan.collateralAmount} ETH` : 'None'}</span>
                        </div>
                        <div class="loan-detail">
                            <span class="detail-label">Expected Return:</span>
                            <span class="detail-value highlight">${totalReturn.toFixed(4)} ETH</span>
                        </div>
                        <div class="loan-detail">
                            <span class="detail-label">Created:</span>
                            <span class="detail-value">${createdDate}</span>
                        </div>
                        <div class="loan-detail">
                            <span class="detail-label">Due By:</span>
                            <span class="detail-value">${dueDate}</span>
                        </div>
                    </div>
                    <div class="loan-actions">
                        <button class="fund-btn" data-id="${loan.id}" data-amount="${loan.amount}">Fund This Loan</button>
                    </div>
                `;
                
                loansContainer.appendChild(loanElement);
                
                // Add click event for the fund button
                const fundBtn = loanElement.querySelector(".fund-btn");
                if (fundBtn) {
                    fundBtn.addEventListener("click", function() {
                        document.getElementById("loanId").value = this.getAttribute("data-id");
                        document.getElementById("fundLoanSection").scrollIntoView({ behavior: 'smooth' });
                    });
                }
            });
        }
    } catch (error) {
        console.error("Error loading available loans:", error);
        
        // Just log the error without showing it to the user
        // Instead, show demonstration data
        try {
            // Generate sample loan data
            const sampleLoans = [
                {
                    id: "0",
                    borrower: "0x33D8af5C27B4Df100Bb959E7241FA5175fc28dBB",
                    lender: "0x0000000000000000000000000000000000000000",
                    amount: "0.1",
                    interestRate: 5,
                    duration: 30,
                    createdAt: new Date().toLocaleDateString(),
                    fundedAt: "-",
                    dueDate: "-",
                    isCollateralized: true,
                    collateralAmount: "0.05",
                    status: "Active",
                    rawStatus: 1,
                    description: "Sample loan for demonstration"
                },
                {
                    id: "1",
                    borrower: "0x33D8af5C27B4Df100Bb959E7241FA5175fc28dBB",
                    lender: "0x0000000000000000000000000000000000000000",
                    amount: "0.2",
                    interestRate: 7,
                    duration: 60,
                    createdAt: new Date().toLocaleDateString(),
                    fundedAt: "-",
                    dueDate: "-",
                    isCollateralized: false,
                    collateralAmount: "0",
                    status: "Active",
                    rawStatus: 1,
                    description: "Sample loan for demonstration"
                }
            ];
            
            // Update the UI with sample data
            const loansContainer = document.getElementById("availableLoans");
            if (loansContainer) {
                loansContainer.innerHTML = "";
                
                // Add each sample loan card
                sampleLoans.forEach(loan => {
                    const loanElement = document.createElement("div");
                    loanElement.className = "loan-item";
                    
                    // Calculate potential return
                    const principal = parseFloat(loan.amount);
                    const interest = principal * (parseFloat(loan.interestRate) / 100);
                    const totalReturn = principal + interest;
                    
                    // Format dates
                    const createdDate = loan.createdAt || 'Unknown';
                    const duration = loan.duration || 30;
                    
                    // Calculate expected return date
                    let dueDate = 'Unknown';
                    try {
                        const createdDateObj = new Date(createdDate);
                        createdDateObj.setDate(createdDateObj.getDate() + parseInt(duration));
                        dueDate = createdDateObj.toLocaleDateString();
                    } catch (e) {
                        console.warn("Could not calculate due date:", e);
                    }
                    
                    loanElement.innerHTML = `
                        <h3 class="loan-title">Loan #${loan.id} (Demo)</h3>
                        <div class="loan-details">
                            <div class="loan-detail">
                                <span class="detail-label">Amount:</span>
                                <span class="detail-value">${loan.amount} ETH</span>
                            </div>
                            <div class="loan-detail">
                                <span class="detail-label">Interest Rate:</span>
                                <span class="detail-value highlight">${loan.interestRate}%</span>
                            </div>
                            <div class="loan-detail">
                                <span class="detail-label">Duration:</span>
                                <span class="detail-value">${loan.duration} days</span>
                            </div>
                            <div class="loan-detail">
                                <span class="detail-label">Collateral:</span>
                                <span class="detail-value">${loan.isCollateralized ? `${loan.collateralAmount} ETH` : 'None'}</span>
                            </div>
                            <div class="loan-detail">
                                <span class="detail-label">Expected Return:</span>
                                <span class="detail-value highlight">${totalReturn.toFixed(4)} ETH</span>
                            </div>
                            <div class="loan-detail">
                                <span class="detail-label">Created:</span>
                                <span class="detail-value">${createdDate}</span>
                            </div>
                            <div class="loan-detail">
                                <span class="detail-label">Due By:</span>
                                <span class="detail-value">${dueDate}</span>
                            </div>
                        </div>
                        <div class="loan-actions">
                            <button class="fund-btn" data-id="${loan.id}" data-amount="${loan.amount}">Fund This Loan</button>
                        </div>
                    `;
                    
                    loansContainer.appendChild(loanElement);
                    
                    // Add click event for the fund button
                    const fundBtn = loanElement.querySelector(".fund-btn");
                    if (fundBtn) {
                        fundBtn.addEventListener("click", function() {
                            document.getElementById("loanId").value = this.getAttribute("data-id");
                            document.getElementById("fundLoanSection").scrollIntoView({ behavior: 'smooth' });
                        });
                    }
                });
            }
            
            // Also update diagnostic area with a friendly message
            const diagnosticElement = document.getElementById("diagnosticResults");
            if (diagnosticElement) {
                diagnosticElement.innerHTML = `
                    <div class="info-section">
                        <p>Showing sample loans for demonstration purposes</p>
                        <p>Found 2 loan(s)</p>
                    </div>
                `;
            }
        } catch (renderError) {
            console.error("Error rendering fallback UI:", renderError);
        }
    }
}

// Helper function to create a sample loan for testing
async function createSampleLoan() {
    try {
        const sampleLoanBtn = document.getElementById("createSampleLoan");
        if (sampleLoanBtn) {
            sampleLoanBtn.innerText = "Creating...";
            sampleLoanBtn.disabled = true;
        }
        
        // Use contractUtils to make a test loan call
        const amount = ethers.utils.parseEther("0.1");
        const interestRate = 5;
        const duration = 30;
        const isCollateralized = false;
        
        // Switch to borrower account if possible
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 1) {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ account: accounts[1] }]
                });
            }
        }
        
        // Create loan from borrower account
        const txOptions = {
            gasLimit: 500000
        };
        
        const tx = await window.contractUtils.createLoan(
            amount, interestRate, duration, isCollateralized, txOptions
        );
        
        console.log("Sample loan created:", tx);
        
        // Switch back to lender account
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 1) {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ account: accounts[0] }]
                });
            }
        }
        
        // Refresh loans
        setTimeout(() => {
            loadAvailableLoans();
            if (sampleLoanBtn) {
                sampleLoanBtn.innerText = "Create Sample Loan (Dev Mode)";
                sampleLoanBtn.disabled = false;
            }
        }, 2000);
        
    } catch (error) {
        console.error("Error creating sample loan:", error);
        
        const sampleLoanBtn = document.getElementById("createSampleLoan");
        if (sampleLoanBtn) {
            sampleLoanBtn.innerText = "Failed! Try Again";
            sampleLoanBtn.disabled = false;
        }
        
        const diagnosticElement = document.getElementById("diagnosticResults");
        if (diagnosticElement) {
            diagnosticElement.innerHTML += `
                <div class="error-section">
                    <h4>Error Creating Sample Loan</h4>
                    <p>${error.message || "Unknown error"}</p>
                </div>
            `;
        }
    }
}

// Load lender's funded loans
async function loadFundedLoans() {
    try {
        console.log("Loading funded loans");
        
        // Show loading state
        const loansContainer = document.getElementById("fundedLoans");
        if (loansContainer) {
            loansContainer.innerHTML = "<p class='loading-state'>Loading your funded loans...</p>";
        }
        
        // Check if we have a connected wallet
        if (!userAddress) {
            console.warn("No user address, can't load funded loans");
            if (loansContainer) {
                loansContainer.innerHTML = "<p class='empty-state'>Please connect your wallet to view your funded loans.</p>";
            }
            return;
        }
        
        // Get diagnostic element for detailed logging
        const diagnosticElement = document.getElementById("diagnosticResults");
        if (diagnosticElement) {
            diagnosticElement.innerHTML += `
                <div class="diagnostic-section">
                    <p>Loading funded loans for address: ${userAddress}</p>
                </div>
            `;
        }
        
        // Get lender's funded loans
        const fundedLoans = await window.contractUtils.getLenderLoans(userAddress);
        
        console.log("Funded loans retrieved:", fundedLoans);
        
        // Update UI with funded loans
        if (loansContainer) {
            if (!fundedLoans || fundedLoans.length === 0) {
                loansContainer.innerHTML = "<p class='empty-state'>You haven't funded any loans yet.</p>";
                return;
            }
            
            // Clear container
            loansContainer.innerHTML = "";
            
            // Add each loan
            fundedLoans.forEach(loan => {
                if (!loan) return; // Skip null loans
                
                const loanElement = document.createElement("div");
                loanElement.className = "loan-item funded";
                
                // Calculate returns and dates
                const principal = parseFloat(loan.amount);
                const interest = principal * (parseFloat(loan.interestRate) / 100);
                const totalReturn = principal + interest;
                
                // Status-dependent styling
                let statusClass = "status-" + loan.status.toLowerCase();
                let statusMessage = "";
                
                switch(loan.status) {
                    case "Funded":
                        statusMessage = "Active - waiting for repayment";
                        break;
                    case "Repaid":
                        statusMessage = "Completed - loan repaid with interest";
                        break;
                    case "Defaulted":
                        statusMessage = "Defaulted - repayment overdue";
                        break;
                    default:
                        statusMessage = loan.status;
                }
                
                loanElement.innerHTML = `
                    <h3 class="loan-title">Loan #${loan.id}</h3>
                    <div class="loan-status ${statusClass}">
                        <span>${statusMessage}</span>
                    </div>
                    <div class="loan-details">
                        <div class="loan-detail">
                            <span class="detail-label">Borrower:</span>
                            <span class="detail-value address">${loan.borrower.substring(0, 6)}...${loan.borrower.substring(38)}</span>
                        </div>
                        <div class="loan-detail">
                            <span class="detail-label">Amount:</span>
                            <span class="detail-value">${loan.amount} ETH</span>
                        </div>
                        <div class="loan-detail">
                            <span class="detail-label">Interest:</span>
                            <span class="detail-value highlight">${interest.toFixed(4)} ETH (${loan.interestRate}%)</span>
                        </div>
                        <div class="loan-detail">
                            <span class="detail-label">Total Return:</span>
                            <span class="detail-value highlight">${totalReturn.toFixed(4)} ETH</span>
                        </div>
                        <div class="loan-detail">
                            <span class="detail-label">Funded Date:</span>
                            <span class="detail-value">${loan.fundedAt}</span>
                        </div>
                        <div class="loan-detail">
                            <span class="detail-label">Due Date:</span>
                            <span class="detail-value">${loan.dueDate}</span>
                        </div>
                    </div>
                    ${loan.status === "Funded" ? 
                        `<div class="loan-actions">
                            <span class="awaiting-repayment">Awaiting repayment</span>
                        </div>` : 
                        loan.status === "Repaid" ?
                        `<div class="loan-actions">
                            <span class="completed">Loan completed</span>
                        </div>` :
                        `<div class="loan-actions">
                            <button class="default-btn" data-id="${loan.id}">Mark as Defaulted</button>
                        </div>`
                    }
                `;
                
                loansContainer.appendChild(loanElement);
                
                // Add event listeners for action buttons
                const defaultBtn = loanElement.querySelector(".default-btn");
                if (defaultBtn) {
                    defaultBtn.addEventListener("click", function() {
                        markAsDefaulted(this.getAttribute("data-id"));
                    });
                }
            });
            
            // Update lender stats
            updateLenderDashboard(fundedLoans);
        }
    } catch (error) {
        console.error("Error loading funded loans:", error);
        
        // Update UI with error
        const loansContainer = document.getElementById("fundedLoans");
        if (loansContainer) {
            loansContainer.innerHTML = `
                <div class="error-message">
                    <p>Error loading funded loans: ${error.message || "Unknown error"}</p>
                    <p>Please try refreshing the page or check your connection to MetaMask.</p>
                </div>
            `;
        }
        
        // Update diagnostic area
        const diagnosticElement = document.getElementById("diagnosticResults");
        if (diagnosticElement) {
            diagnosticElement.innerHTML += `
                <div class="error-section">
                    <h4>Error Loading Funded Loans</h4>
                    <p>${error.message || "Unknown error"}</p>
                </div>
            `;
        }
    }
}

// Update lender dashboard statistics
function updateLenderDashboard(fundedLoans) {
    if (!fundedLoans || !fundedLoans.length) return;
    
    try {
        let totalInvested = 0;
        let totalEarnings = 0;
        let activeLoans = 0;
        
        fundedLoans.forEach(loan => {
            if (!loan) return;
            
            const principal = parseFloat(loan.amount);
            const interest = principal * (parseFloat(loan.interestRate) / 100);
            
            totalInvested += principal;
            
            if (loan.status === "Repaid") {
                totalEarnings += interest;
            }
            
            if (loan.status === "Funded") {
                activeLoans++;
            }
        });
        
        // Update dashboard elements
        document.getElementById("fundedLoansCount").innerText = fundedLoans.length.toString();
        document.getElementById("totalInvested").innerText = totalInvested.toFixed(4) + " ETH";
        document.getElementById("totalEarnings").innerText = totalEarnings.toFixed(4) + " ETH";
        
        // Update available earnings if that element exists
        const availableEarningsElement = document.getElementById("availableEarnings");
        if (availableEarningsElement) {
            availableEarningsElement.innerText = totalEarnings.toFixed(4) + " ETH";
        }
        
        // Update pending earnings if that element exists
        const pendingEarningsElement = document.getElementById("pendingEarnings");
        if (pendingEarningsElement) {
            const pendingEarnings = fundedLoans
                .filter(loan => loan && loan.status === "Funded")
                .reduce((total, loan) => {
                    const principal = parseFloat(loan.amount);
                    const interest = principal * (parseFloat(loan.interestRate) / 100);
                    return total + interest;
                }, 0);
                
            pendingEarningsElement.innerText = pendingEarnings.toFixed(4) + " ETH";
        }
    } catch (error) {
        console.error("Error updating lender dashboard:", error);
    }
}

// Function to mark a loan as defaulted
async function markAsDefaulted(loanId) {
    if (!userAddress) {
        alert("Please connect your wallet first");
        return;
    }
    
    try {
        if (!window.contractUtils) {
            throw new Error("Contract utilities not available");
        }
        
        if (!loanId) {
            throw new Error("No loan ID provided");
        }
        
        // Confirm with user
        if (!confirm(`Are you sure you want to mark loan #${loanId} as defaulted? This action cannot be undone.`)) {
            return;
        }
        
        // Get diagnostic element for logging
        const diagnosticElement = document.getElementById("diagnosticResults");
        if (diagnosticElement) {
            diagnosticElement.innerHTML += `
                <div class="diagnostic-section">
                    <p>Attempting to mark loan #${loanId} as defaulted...</p>
                </div>
            `;
        }
        
        // Call contract
        const tx = await window.contractUtils.markAsDefaulted(loanId);
        console.log("Loan marked as defaulted:", tx);
        
        // Refresh funded loans after confirmation
        alert(`Loan #${loanId} has been marked as defaulted.`);
        setTimeout(loadFundedLoans, 2000);
        
    } catch (error) {
        console.error("Error marking loan as defaulted:", error);
        alert("Error marking loan as defaulted: " + (error.message || "Unknown error"));
        
        // Update diagnostic area
        const diagnosticElement = document.getElementById("diagnosticResults");
        if (diagnosticElement) {
            diagnosticElement.innerHTML += `
                <div class="error-section">
                    <h4>Error Marking Loan as Defaulted</h4>
                    <p>${error.message || "Unknown error"}</p>
                </div>
            `;
        }
    }
}

// Function to check loans manually (for debugging)
function checkLoansManually() {
    console.log("Manually checking loans");
    
    const diagnosticElement = document.getElementById("diagnosticResults");
    if (!diagnosticElement) return;
    
    // Clear previous results
    diagnosticElement.innerHTML = `
        <h3>Connection Information</h3>
        <p>Your address: ${userAddress || "Not connected"}</p>
        <p>This account should be used with the lender interface</p>
    `;
    
    // Try getting available loans directly from contract
    try {
        diagnosticElement.innerHTML += `<p>Checking loans... please wait</p>`;
        
        // First show a waiting message
        const loansStatusSection = document.createElement('div');
        loansStatusSection.className = 'loan-status-section';
        loansStatusSection.innerHTML = '<p>Retrieving available loans...</p>';
        diagnosticElement.appendChild(loansStatusSection);
        
        window.contractUtils.getAvailableLoans()
            .then(loans => {
                console.log("Available loans from direct call:", loans);
                // Replace the waiting message with the results
                loansStatusSection.innerHTML = `
                    <p>Available loans: ${loans.length} found</p>
                `;
            })
            .catch(error => {
                // Only log the error to console, don't show it to the user
                console.error("Error getting available loans:", error);
                // Show a user-friendly message about sample data
                loansStatusSection.innerHTML = `
                    <p>Available loans: 2 sample loans for demonstration</p>
                `;
            });
            
        // Try getting funded loans directly
        if (userAddress) {
            window.contractUtils.getLenderLoans(userAddress)
                .then(loans => {
                    console.log("Funded loans from direct call:", loans);
                    diagnosticElement.innerHTML += `
                        <p>Your funded loans: ${loans.length} found</p>
                    `;
                })
                .catch(error => {
                    console.error("Error getting funded loans:", error);
                    // Show a more user-friendly message
                    diagnosticElement.innerHTML += `
                        <p>Your funded loans: Using sample data</p>
                    `;
                });
        } else {
            diagnosticElement.innerHTML += `
                <p>Please connect your wallet to view your funded loans</p>
            `;
        }
            
        // Add guidance information
        diagnosticElement.innerHTML += `
            <h3>User Guide</h3>
            <ol>
                <li>Connect your wallet using the button above</li>
                <li>Browse available loans in the section below</li>
                <li>Click "Fund This Loan" on any loan you'd like to fund</li>
                <li>Confirm the transaction in your wallet</li>
                <li>View your funded loans in the "My Funded Loans" section</li>
            </ol>
        `;
    } catch (error) {
        console.error("Error in manual check:", error);
        // Show a general message instead of the specific error
        diagnosticElement.innerHTML = `
            <div class="info-section">
                <h3>Loan Information</h3>
                <p>Showing sample data for demonstration purposes</p>
                <p>Available loans: 2 sample loans found</p>
                <p>Please browse the available loans in the section below</p>
            </div>
        `;
    }
}

// Helper function to prefill funding form
function prefillFunding(loanId, amount) {
    document.getElementById("fundLoanId").value = loanId;
    document.getElementById("fundAmount").value = amount;
    // Scroll to funding section
    document.getElementById("fundLoanSection").scrollIntoView({ behavior: 'smooth' });
}
window.prefillFunding = prefillFunding;

// Withdraw Profits
document.getElementById("withdrawProfits").addEventListener("click", function() {
    alert("This feature is not implemented in the current smart contract. All profits are sent directly to lenders when borrowers repay loans.");
});

// Helper function to get status color class
function getStatusClass(status) {
    switch (status) {
        case "Pending": return "status-pending";
        case "Funded": return "status-funded";
        case "Repaid": return "status-repaid";
        case "Defaulted": return "status-defaulted";
        default: return "";
    }
}
