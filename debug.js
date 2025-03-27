/**
 * Debug utility for the MicroLoan Platform
 * Provides console logging and debugging features
 */

// Set debug level: 0 = none, 1 = errors only, 2 = warnings, 3 = info, 4 = verbose
const DEBUG_LEVEL = 4;

// Initialize debug system
(function() {
    console.log("Debug system initialized");
    checkDependencies();
})();

// Check dependencies
function checkDependencies() {
    console.log("Checking dependencies...");
    
    // Check for ethers.js
    if (typeof window.ethers !== 'undefined') {
        console.log("✅ ethers.js is available:", window.ethers.version);
    } else {
        console.error("❌ ethers.js is NOT available! This will cause wallet connection errors.");
        console.log("Attempting to diagnose the issue:");
        
        // Check if script tags for ethers exist
        const ethersTags = document.querySelectorAll('script[src*="ethers"]');
        if (ethersTags.length === 0) {
            console.error("No ethers.js script tags found in the document.");
        } else {
            console.log(`Found ${ethersTags.length} ethers.js script tags:`);
            ethersTags.forEach((tag, i) => {
                console.log(`  ${i+1}. ${tag.src}`);
            });
        }
        
        // Suggest solution
        console.log("Possible solutions:");
        console.log("1. Check your internet connection");
        console.log("2. Try using a different CDN: https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js");
        console.log("3. Download ethers.js and host it locally");
        
        // Create a visible error message
        setTimeout(() => {
            const ethersErrorDiv = document.createElement('div');
            ethersErrorDiv.style.position = 'fixed';
            ethersErrorDiv.style.top = '10px';
            ethersErrorDiv.style.left = '10px';
            ethersErrorDiv.style.right = '10px';
            ethersErrorDiv.style.backgroundColor = '#ffcccc';
            ethersErrorDiv.style.color = '#cc0000';
            ethersErrorDiv.style.padding = '10px';
            ethersErrorDiv.style.border = '1px solid #cc0000';
            ethersErrorDiv.style.borderRadius = '5px';
            ethersErrorDiv.style.zIndex = '9999';
            ethersErrorDiv.innerHTML = `
                <strong>Error:</strong> ethers.js library failed to load. This will prevent wallet connection.
                <br>Please check your internet connection and try refreshing the page.
                <button style="float:right; background: #cc0000; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;"
                    onclick="this.parentNode.style.display='none'">Dismiss</button>
            `;
            document.body.appendChild(ethersErrorDiv);
        }, 1000);
    }
    
    // Check for MetaMask
    if (window.ethereum) {
        console.log("✅ MetaMask is installed");
        
        // Get MetaMask version if available
        if (window.ethereum.isMetaMask) {
            console.log("MetaMask detected, version info:", window.ethereum.version || "Unknown");
        }
    } else {
        console.error("❌ MetaMask not detected!");
    }
    
    // Check contract utilities
    if (window.contractUtils) {
        console.log("✅ Contract utilities loaded");
        console.log("  Contract address:", window.contractUtils.CONTRACT_ADDRESS);
    } else {
        console.error("❌ Contract utilities not loaded!");
    }
}

// Check environment and dependencies
function checkEnvironment() {
    // Log user agent
    console.log("Browser:", navigator.userAgent);
}

// Intercept contract calls
const originalContractUtils = window.contractUtils || {};
window.contractUtils = new Proxy(originalContractUtils, {
    get: function(target, prop) {
        const original = target[prop];
        if (typeof original === 'function') {
            return async function(...args) {
                console.log(`📞 Contract call: ${prop}`, args);
                try {
                    const result = await original.apply(this, args);
                    console.log(`✅ Contract response: ${prop}`, result);
                    return result;
                } catch (error) {
                    console.error(`❌ Contract error in ${prop}:`, error);
                    // Enhance error messages
                    if (error.message && error.message.includes("user rejected")) {
                        console.warn("User rejected the transaction in MetaMask");
                    }
                    if (error.message && error.message.includes("insufficient funds")) {
                        console.warn("Insufficient funds for transaction. Make sure you have enough ETH for gas and transaction value.");
                    }
                    throw error;
                }
            };
        }
        return original;
    }
});

// MetaMask connection monitor
if (window.ethereum) {
    window.ethereum.on('connect', (connectInfo) => {
        console.log('MetaMask connected:', connectInfo);
    });
    
    window.ethereum.on('disconnect', (error) => {
        console.error('MetaMask disconnected:', error);
    });
    
    window.ethereum.on('accountsChanged', (accounts) => {
        console.log('MetaMask accounts changed:', accounts);
    });
    
    window.ethereum.on('chainChanged', (chainId) => {
        console.log('MetaMask network changed. Chain ID:', chainId);
        console.log('Decimal chain ID:', parseInt(chainId, 16));
    });
    
    window.ethereum.on('message', (message) => {
        console.log('MetaMask message:', message);
    });
}

// Helper functions
window.debug = {
    // Check ethers.js availability
    checkEthers() {
        if (typeof window.ethers !== 'undefined') {
            console.log("ethers.js is available:", window.ethers.version);
            return true;
        } else {
            console.error("ethers.js is NOT available!");
            return false;
        }
    },
    
    // Attempt to manually load ethers.js
    loadEthers() {
        if (typeof window.ethers !== 'undefined') {
            console.log("ethers.js is already loaded");
            return true;
        }
        
        console.log("Attempting to manually load ethers.js");
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";
            script.onload = function() {
                console.log("Successfully loaded ethers.js");
                if (typeof window.ethers !== 'undefined') {
                    resolve(true);
                } else {
                    console.error("ethers loaded but not available as window.ethers");
                    resolve(false);
                }
            };
            script.onerror = function() {
                console.error("Failed to load ethers.js");
                reject(new Error("Failed to load ethers.js"));
            };
            document.head.appendChild(script);
        });
    },
    
    // Get detailed network info
    async getNetworkInfo() {
        if (!window.ethereum) return "MetaMask not installed";
        if (!window.ethers) return "ethers.js not available";
        
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const network = await provider.getNetwork();
            const blockNumber = await provider.getBlockNumber();
            return {
                name: network.name,
                chainId: network.chainId,
                blockNumber: blockNumber,
                ensAddress: network.ensAddress,
                hexChainId: "0x" + network.chainId.toString(16)
            };
        } catch (error) {
            console.error("Error getting network info:", error);
            return "Error getting network info";
        }
    },
    
    // Get account info
    async getAccountInfo() {
        if (!window.ethereum) return "MetaMask not installed";
        if (!window.ethers) return "ethers.js not available";
        
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const address = await signer.getAddress();
            const balance = await provider.getBalance(address);
            return {
                address: address,
                balance: ethers.utils.formatEther(balance),
                balanceWei: balance.toString()
            };
        } catch (error) {
            console.error("Error getting account info:", error);
            return "Error getting account info";
        }
    },
    
    // Test contract connection
    async testContractConnection() {
        if (!window.contractUtils) {
            return "Contract utilities not loaded";
        }
        if (!window.ethers) {
            return "ethers.js not available";
        }
        
        try {
            const contract = await window.contractUtils.getContract();
            return {
                contractAddress: contract.address,
                contractFunctions: Object.keys(contract.functions)
                    .filter(f => !f.includes('('))
            };
        } catch (error) {
            console.error("Error testing contract connection:", error);
            return "Error connecting to contract";
        }
    }
};

// Add debug buttons to page in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    document.addEventListener('DOMContentLoaded', function() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debugPanel';
        debugPanel.style.position = 'fixed';
        debugPanel.style.bottom = '10px';
        debugPanel.style.right = '10px';
        debugPanel.style.zIndex = '9999';
        
        // Create debug button
        const debugButton = document.createElement('button');
        debugButton.innerText = 'Debug';
        debugButton.style.padding = '5px 10px';
        debugButton.style.backgroundColor = '#333';
        debugButton.style.color = 'white';
        debugButton.style.border = 'none';
        debugButton.style.borderRadius = '4px';
        debugButton.style.cursor = 'pointer';
        
        debugButton.addEventListener('click', async function() {
            console.log('----- DEBUG INFO -----');
            console.log('ethers.js available:', window.debug.checkEthers());
            console.log('Network:', await window.debug.getNetworkInfo());
            console.log('Account:', await window.debug.getAccountInfo());
            console.log('Contract:', await window.debug.testContractConnection());
            console.log('---------------------');
            alert('Debug info logged to console. Press F12 to view.');
        });
        
        debugPanel.appendChild(debugButton);
        document.body.appendChild(debugPanel);
    });
} 