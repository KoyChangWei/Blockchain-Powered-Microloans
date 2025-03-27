// MicroLoan Platform - Main Application Script
document.addEventListener('DOMContentLoaded', function() {
    console.log("App initialized");
    
    // Connect wallet button
    const connectWalletBtn = document.getElementById("connectWallet");
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener("click", connectWallet);
        console.log("Connect wallet button event listener added");
    } else {
        console.warn("Connect wallet button not found");
    }
    
    // Switch account button
    const switchAccountBtn = document.getElementById("switchAccount");
    if (switchAccountBtn) {
        switchAccountBtn.addEventListener("click", switchAccount);
        console.log("Switch account button event listener added");
    } else {
        console.warn("Switch account button not found");
    }
    
    // Role selection buttons
    const borrowerBtn = document.getElementById("borrowerBtn");
    const lenderBtn = document.getElementById("lenderBtn");
    
    if (borrowerBtn) {
        console.log("Borrower button found");
        borrowerBtn.addEventListener("click", function() {
            console.log("Borrower button clicked");
            window.location.href = "borrower.html";
        });
    } else {
        console.warn("Borrower button not found in the DOM");
    }
    
    if (lenderBtn) {
        console.log("Lender button found");
        lenderBtn.addEventListener("click", function() {
            console.log("Lender button clicked");
            window.location.href = "lender.html";
        });
    } else {
        console.warn("Lender button not found in the DOM");
    }
    
    // Check if MetaMask is installed
    if (window.ethereum) {
        console.log("Ethereum provider detected");
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', function (accounts) {
            console.log("Account changed:", accounts[0]);
            updateWalletInfo();
        });
        
        // Listen for network changes
        window.ethereum.on('chainChanged', function (chainId) {
            console.log("Network changed to chain ID:", chainId);
            checkNetwork();
            updateWalletInfo();
        });
        
        // Auto-connect if previously connected
        checkPreviousConnection();
    } else {
        console.warn("No Ethereum provider detected. Please install MetaMask.");
        const walletStatus = document.getElementById("walletStatus");
        if (walletStatus) {
            walletStatus.innerHTML = `
                <div class="alert alert-warning">
                    MetaMask not detected! Please <a href="https://metamask.io/download.html" target="_blank">install MetaMask</a> to use this application.
                </div>
            `;
        }
    }
    
    // Add event listeners for loan action buttons if they exist
    setupLoanActionButtons();
});

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
        // which will update the wallet info
    } catch (error) {
        console.error("Account switch failed:", error);
        alert("Failed to switch accounts: " + (error.message || "Unknown error"));
    }
}

// Set up loan action buttons if they exist on this page
function setupLoanActionButtons() {
    // Apply loan button
    const applyLoanBtn = document.getElementById("applyLoan");
    if (applyLoanBtn) {
        applyLoanBtn.addEventListener("click", function() {
            console.log("Apply loan button clicked");
            // This should be implemented with contractUtils.createLoan
            alert("Loan application submitted! Check the transaction status.");
        });
    }
    
    // Fund loan button
    const fundLoanBtn = document.getElementById("fundLoan");
    if (fundLoanBtn) {
        fundLoanBtn.addEventListener("click", function() {
            console.log("Fund loan button clicked");
            // This should be implemented with contractUtils.fundLoan
            alert("Loan funding processed! Check the transaction status.");
        });
    }
    
    // Repay loan button
    const repayLoanBtn = document.getElementById("repayLoan");
    if (repayLoanBtn) {
        repayLoanBtn.addEventListener("click", function() {
            console.log("Repay loan button clicked");
            // This should be implemented with contractUtils.repayLoan
            alert("Loan repayment completed! Check the transaction status.");
        });
    }
    
    // View status button
    const viewStatusBtn = document.getElementById("viewStatus");
    if (viewStatusBtn) {
        viewStatusBtn.addEventListener("click", function() {
            console.log("View status button clicked");
            const loanStatus = document.getElementById("loanStatus");
            if (loanStatus) {
                loanStatus.innerText = "Loan Status: (Blockchain integration required)";
            }
        });
    }
}

// Check for previous connection
async function checkPreviousConnection() {
    if (window.ethereum) {
        try {
            // Check if already connected
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                console.log("Previously connected account found:", accounts[0]);
                await connectWallet(true); // Silent connect
            }
            
            // Check network
            await checkNetwork();
        } catch (error) {
            console.error("Error checking previous connection:", error);
        }
    }
}

// Connect wallet function
async function connectWallet(silent = false) {
    if (!window.ethereum) {
        if (!silent) {
            alert("MetaMask is not installed! Please install MetaMask to use this application.");
        }
        console.error("No ethereum provider detected");
        return;
    }
    
    try {
        // Check if ethers is loaded
        if (typeof window.ethers === 'undefined') {
            console.error("ethers is not defined when trying to connect wallet");
            if (!silent) {
                alert("Failed to connect wallet: ethers library is not loaded. Please refresh the page and try again.");
            }
            return false;
        }
        
        console.log("Requesting accounts...");
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        console.log("Connected to account:", accounts[0]);
        
        // Update UI with wallet info
        await updateWalletInfo();
        
        // Check network
        await checkNetwork();
        
        // Load platform stats if available
        await loadPlatformStats();
        
        return true;
    } catch (error) {
        console.error("Wallet connection failed:", error);
        
        if (!silent) {
            if (error.code === 4001) {
                // User rejected the connection request
                alert("You rejected the connection request. Please connect your wallet to use this application.");
            } else {
                alert("Failed to connect wallet: " + (error.message || "Unknown error"));
            }
        }
        
        return false;
    }
}

// Update wallet info in UI
async function updateWalletInfo() {
    if (!window.ethereum) return;
    
    try {
        if (typeof window.ethers === 'undefined') {
            console.error("ethers is not defined when trying to update wallet info");
            return null;
        }
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length === 0) {
            const walletStatus = document.getElementById("walletStatus");
            if (walletStatus) {
                walletStatus.innerHTML = `
                    <div class="alert alert-warning">
                        Wallet not connected. Please connect your wallet to use this application.
                    </div>
                `;
            }
            return;
        }
        
        const userAddress = accounts[0];
        const signer = provider.getSigner();
        const balance = await provider.getBalance(userAddress);
        const network = await provider.getNetwork();
        
        console.log("Connected to:", {
            address: userAddress,
            network: network.name,
            chainId: network.chainId,
            balance: ethers.utils.formatEther(balance)
        });
        
        // Update wallet address display
        const walletAddressElement = document.getElementById("walletAddress");
        if (walletAddressElement) {
            walletAddressElement.innerText = `Connected: ${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
        }
        
        // Update wallet balance display
        const walletBalanceElement = document.getElementById("walletBalance");
        if (walletBalanceElement) {
            walletBalanceElement.innerText = `Balance: ${parseFloat(ethers.utils.formatEther(balance)).toFixed(4)} ETH`;
        }
        
        // Update network info display
        const networkInfoElement = document.getElementById("networkInfo");
        if (networkInfoElement) {
            networkInfoElement.innerText = `Network: ${network.name}`;
        }
        
        // Show wallet status
        const walletStatusElement = document.getElementById("walletStatus");
        if (walletStatusElement) {
            walletStatusElement.innerHTML = `
                <div class="alert alert-success">
                    Connected to wallet: ${userAddress.substring(0, 6)}...${userAddress.substring(38)}
                </div>
            `;
        }
        
        // Update button text
        const connectWalletBtn = document.getElementById("connectWallet");
        if (connectWalletBtn) {
            connectWalletBtn.innerText = "Wallet Connected";
            connectWalletBtn.classList.add("connected");
        }
        
        return {
            address: userAddress,
            network: network.name,
            chainId: network.chainId
        };
    } catch (error) {
        console.error("Error updating wallet info:", error);
        return null;
    }
}

// Check if connected to the correct network (Sepolia)
async function checkNetwork() {
    if (!window.ethereum) return false;
    
    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const sepoliaChainId = '0xaa36a7'; // 11155111 in decimal
        
        console.log("Current chain ID:", chainId);
        
        const networkAlertElement = document.getElementById("networkAlert");
        if (!networkAlertElement) return false;
        
        if (chainId !== sepoliaChainId) {
            networkAlertElement.innerHTML = `
                <div class="alert alert-warning">
                    You are not connected to the Sepolia test network. Please switch networks in MetaMask.
                    <button id="switchNetworkBtn" class="btn btn-sm btn-warning">Switch to Sepolia</button>
                </div>
            `;
            
            // Add click event for switch network button
            const switchBtn = document.getElementById("switchNetworkBtn");
            if (switchBtn) {
                switchBtn.addEventListener("click", switchToSepolia);
            }
            return false;
        } else {
            networkAlertElement.innerHTML = "";
            return true;
        }
    } catch (error) {
        console.error("Error checking network:", error);
        return false;
    }
}

// Switch to Sepolia network
async function switchToSepolia() {
    if (!window.ethereum) return;
    
    try {
        // Try to switch to Sepolia
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
        });
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0xaa36a7',
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

// Load platform statistics from the contract
async function loadPlatformStats() {
    try {
        // Check if contractUtils exists and is initialized
        if (window.contractUtils && typeof window.contractUtils.getPlatformStats === 'function') {
            console.log("Loading platform stats...");
            const stats = await window.contractUtils.getPlatformStats();
            
            if (stats) {
                const totalLoansElement = document.getElementById("totalLoans");
                const totalVolumeElement = document.getElementById("totalVolume");
                const avgInterestRateElement = document.getElementById("avgInterestRate");
                
                if (totalLoansElement) totalLoansElement.innerText = stats.activeLoans;
                if (totalVolumeElement) totalVolumeElement.innerText = `${stats.totalLoanVolume} ETH`;
                if (avgInterestRateElement) avgInterestRateElement.innerText = `${stats.avgInterestRate}%`;
            }
        } else {
            console.warn("contractUtils not available or getPlatformStats not implemented");
        }
    } catch (error) {
        console.error("Failed to load platform stats:", error);
        const totalLoansElement = document.getElementById("totalLoans");
        const totalVolumeElement = document.getElementById("totalVolume");
        const avgInterestRateElement = document.getElementById("avgInterestRate");
        
        if (totalLoansElement) totalLoansElement.innerText = "0";
        if (totalVolumeElement) totalVolumeElement.innerText = "0 ETH";
        if (avgInterestRateElement) avgInterestRateElement.innerText = "0%";
    }
} 