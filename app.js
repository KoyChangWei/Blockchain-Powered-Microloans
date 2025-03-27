document.addEventListener('DOMContentLoaded', function() {
    console.log("App.js loaded and DOM ready");
    
    // Connect wallet button
    document.getElementById("connectWallet").addEventListener("click", connectWallet);
    
    // Navigation buttons
    document.getElementById("borrowerBtn").addEventListener("click", function() {
        window.location.href = "borrower.html";
    });
    
    document.getElementById("lenderBtn").addEventListener("click", function() {
        window.location.href = "lender.html";
    });
    
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
        const address = await signer.getAddress();
        
        console.log("Connected to address:", address);
        document.getElementById("walletAddress").innerText = `Connected: ${address.substring(0, 6)}...${address.substring(38)}`;
        
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
        const balance = await provider.getBalance(address);
        document.getElementById("walletBalance").innerText = `Balance: ${ethers.utils.formatEther(balance)} ETH`;
        
        // Load platform statistics
        loadPlatformStats();
    } catch (error) {
        console.error("Wallet connection failed:", error);
        alert("Failed to connect wallet: " + (error.message || "Unknown error"));
    }
}

// Load platform statistics from the contract
async function loadPlatformStats() {
    try {
        const stats = await window.contractUtils.getPlatformStats();
        if (stats) {
            document.getElementById("totalLoans").innerText = stats.activeLoans;
            document.getElementById("totalVolume").innerText = `${stats.totalLoanVolume} ETH`;
            document.getElementById("avgInterestRate").innerText = `${stats.avgInterestRate}%`;
        }
    } catch (error) {
        console.error("Failed to load platform stats:", error);
        document.getElementById("totalLoans").innerText = "0";
        document.getElementById("totalVolume").innerText = "0 ETH";
        document.getElementById("avgInterestRate").innerText = "0%";
    }
}

// Placeholder functions for loan actions
document.getElementById("applyLoan").addEventListener("click", function() {
    alert("Loan application submitted! (Blockchain integration required)");
});

document.getElementById("fundLoan").addEventListener("click", function() {
    alert("Loan funding processed! (Blockchain integration required)");
});

document.getElementById("repayLoan").addEventListener("click", function() {
    alert("Loan repayment completed! (Blockchain integration required)");
});

document.getElementById("viewStatus").addEventListener("click", function() {
    document.getElementById("loanStatus").innerText = "Loan Status: (Blockchain integration required)";
});
