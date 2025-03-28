/**
 * Debug utility for the MicroLoan Platform
 * Provides console logging and debugging features
 */

// Set debug level: 0 = none, 1 = errors only, 2 = warnings, 3 = info, 4 = verbose
const DEBUG_LEVEL = 4;

// Initialize debug system
(function() {
    console.log("Debug system initialized");
    
    // Run dependency check after a delay to give ethers.js time to load
    setTimeout(() => {
        checkDependencies();
    }, 1500); // Wait 1.5 seconds before checking
    
    // Create debug panel after DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        createDebugPanel();
    });
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
        
        // Try to load ethers.js dynamically
        console.log("Attempting to load ethers.js dynamically...");
        const script = document.createElement('script');
        script.src = "js/ethers-5.7.2.umd.min.js";  // Use local file first
        script.onload = function() {
            console.log("Successfully loaded ethers.js dynamically");
            if (window.contractUtils && typeof window.contractUtils.init === 'function') {
                window.contractUtils.init();
            }
        };
        script.onerror = function() {
            console.error("Failed to load local ethers.js, trying CDN fallback");
            // Try CDN as fallback
            const cdnScript = document.createElement('script');
            cdnScript.src = "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";
            cdnScript.onload = function() {
                console.log("Successfully loaded ethers.js from CDN");
                if (window.contractUtils && typeof window.contractUtils.init === 'function') {
                    window.contractUtils.init();
                }
            };
            cdnScript.onerror = function() {
                console.error("All ethers.js loading attempts failed");
            };
            document.head.appendChild(cdnScript);
        };
        document.head.appendChild(script);
        
        // Do NOT create visible error message - just use console warnings
        console.log("Possible solutions:");
        console.log("1. Check your internet connection");
        console.log("2. Try using a different CDN: https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js");
        console.log("3. Download ethers.js and host it locally");
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
                console.log(`馃摓 Contract call: ${prop}`, args);
                try {
                    const result = await original.apply(this, args);
                    console.log(`鉁?Contract response: ${prop}`, result);
                    return result;
                } catch (error) {
                    console.error(`鉂?Contract error in ${prop}:`, error);
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

// Helper functions for borrower loan diagnostics
window.loanDebug = {
    // Get all loans for current wallet
    async checkUserLoans() {
        if (!window.ethereum || typeof window.ethers === 'undefined' || !window.contractUtils) {
            console.error("Required dependencies not available");
            return "Dependencies not available";
        }
        
        try {
            // Get user address
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const address = await signer.getAddress();
            
            console.log("Checking loans for address:", address);
            
            // Get contract directly
            const contract = await window.contractUtils.getContract();
            
            // Call getBorrowerLoans directly
            const loanIds = await contract.getBorrowerLoans(address);
            console.log("Direct contract call result:", loanIds);
            
            // Convert BigNumber objects to strings
            const loans = loanIds.map(id => id.toString());
            console.log("Converted loan IDs:", loans);
            
            // Count active loans
            const activeLoans = loans.length;
            console.log("Total loans found:", activeLoans);
            
            // If there are loans, get details
            if (activeLoans > 0) {
                const loanDetails = await Promise.all(
                    loans.map(id => window.contractUtils.getLoanDetails(id))
                );
                console.log("Loan details:", loanDetails);
                return {
                    address,
                    loanIds: loans,
                    loanCount: activeLoans,
                    details: loanDetails
                };
            }
            
            return {
                address,
                loanIds: loans,
                loanCount: activeLoans,
                details: []
            };
        } catch (error) {
            console.error("Error in loan diagnostic:", error);
            return `Error: ${error.message}`;
        }
    },
    
    // Force refresh loans on borrower page
    forceRefresh() {
        if (typeof loadBorrowerLoans === 'function') {
            console.log("Forcing refresh of borrower loans...");
            loadBorrowerLoans();
            return "Refresh triggered";
        } else {
            console.error("loadBorrowerLoans function not available on this page");
            return "loadBorrowerLoans function not available";
        }
    },
    
    // Test contract function directly
    async testContractLoanCreation() {
        if (!window.ethereum || typeof window.ethers === 'undefined' || !window.contractUtils) {
            return "Dependencies not available";
        }
        
        try {
            console.log("Running manual contract test");
            
            // Get contract and signer
            const contract = await window.contractUtils.getContract();
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const userAddress = await provider.getSigner().getAddress();
            
            console.log("User address:", userAddress);
            
            // Check current loans
            const currentLoans = await contract.getBorrowerLoans(userAddress);
            console.log("Current loans:", currentLoans.map(id => id.toString()));
            
            return {
                userAddress,
                currentLoans: currentLoans.map(id => id.toString())
            };
        } catch (error) {
            console.error("Error in contract test:", error);
            return `Error: ${error.message}`;
        }
    }
};

// Create a debug panel for easier troubleshooting
function createDebugPanel() {
    // Create debug toggle button
    const debugToggle = document.createElement('button');
    debugToggle.textContent = '🛠️ Debug';
    debugToggle.style.position = 'fixed';
    debugToggle.style.bottom = '10px';
    debugToggle.style.right = '10px';
    debugToggle.style.padding = '5px 10px';
    debugToggle.style.background = '#333';
    debugToggle.style.color = 'white';
    debugToggle.style.border = 'none';
    debugToggle.style.borderRadius = '5px';
    debugToggle.style.zIndex = '9998';
    debugToggle.style.cursor = 'pointer';
    
    // Create debug panel
    const debugPanel = document.createElement('div');
    debugPanel.style.position = 'fixed';
    debugPanel.style.bottom = '50px';
    debugPanel.style.right = '10px';
    debugPanel.style.width = '400px';
    debugPanel.style.maxHeight = '500px';
    debugPanel.style.overflowY = 'auto';
    debugPanel.style.background = '#222';
    debugPanel.style.color = '#ddd';
    debugPanel.style.padding = '15px';
    debugPanel.style.borderRadius = '5px';
    debugPanel.style.zIndex = '9997';
    debugPanel.style.fontFamily = 'monospace';
    debugPanel.style.fontSize = '12px';
    debugPanel.style.display = 'none';
    debugPanel.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    
    // Panel title
    const title = document.createElement('h3');
    title.textContent = 'Debug Panel - Wallet Connection';
    title.style.color = '#fff';
    title.style.marginTop = '0';
    debugPanel.appendChild(title);
    
    // Create status checks
    function createStatusItem(label, id) {
        const item = document.createElement('div');
        item.style.margin = '10px 0';
        
        const itemLabel = document.createElement('span');
        itemLabel.textContent = label;
        itemLabel.style.display = 'inline-block';
        itemLabel.style.width = '150px';
        item.appendChild(itemLabel);
        
        const status = document.createElement('span');
        status.id = id;
        status.textContent = 'Checking...';
        status.style.color = '#aaa';
        item.appendChild(status);
        
        return item;
    }
    
    // Add status checks
    debugPanel.appendChild(createStatusItem('Window.ethereum:', 'debug-ethereum'));
    debugPanel.appendChild(createStatusItem('ethers.js:', 'debug-ethers'));
    debugPanel.appendChild(createStatusItem('Contract utilities:', 'debug-contract'));
    debugPanel.appendChild(createStatusItem('Network:', 'debug-network'));
    debugPanel.appendChild(createStatusItem('Contract address:', 'debug-address'));
    
    // Add action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.style.marginTop = '20px';
    
    // Test connection button
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test Connection';
    testBtn.style.margin = '5px';
    testBtn.style.padding = '5px 10px';
    testBtn.style.background = '#2c2';
    testBtn.style.color = 'white';
    testBtn.style.border = 'none';
    testBtn.style.borderRadius = '3px';
    testBtn.style.cursor = 'pointer';
    testBtn.onclick = refreshDebugInfo;
    actionsDiv.appendChild(testBtn);
    
    // Reload ethers button
    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Reload ethers.js';
    reloadBtn.style.margin = '5px';
    reloadBtn.style.padding = '5px 10px';
    reloadBtn.style.background = '#22c';
    reloadBtn.style.color = 'white';
    reloadBtn.style.border = 'none';
    reloadBtn.style.borderRadius = '3px';
    reloadBtn.style.cursor = 'pointer';
    reloadBtn.onclick = function() {
        window.debug.loadEthers().then(() => {
            refreshDebugInfo();
        }).catch(err => {
            console.error("Failed to load ethers:", err);
        });
    };
    actionsDiv.appendChild(reloadBtn);
    
    // Refresh page button
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh Page';
    refreshBtn.style.margin = '5px';
    refreshBtn.style.padding = '5px 10px';
    refreshBtn.style.background = '#c22';
    refreshBtn.style.color = 'white';
    refreshBtn.style.border = 'none';
    refreshBtn.style.borderRadius = '3px';
    refreshBtn.style.cursor = 'pointer';
    refreshBtn.onclick = function() {
        window.location.reload();
    };
    actionsDiv.appendChild(refreshBtn);
    
    debugPanel.appendChild(actionsDiv);
    
    // Add to DOM
    document.body.appendChild(debugToggle);
    document.body.appendChild(debugPanel);
    
    // Toggle debug panel on click
    debugToggle.addEventListener('click', function() {
        const isVisible = debugPanel.style.display !== 'none';
        debugPanel.style.display = isVisible ? 'none' : 'block';
        
        // Refresh debug info when panel is opened
        if (!isVisible) {
            refreshDebugInfo();
        }
    });
}

// Refresh debug panel information
function refreshDebugInfo() {
    // Check ethereum
    const ethereumStatus = document.getElementById('debug-ethereum');
    if (ethereumStatus) {
        if (window.ethereum) {
            ethereumStatus.textContent = 'Available ✅';
            ethereumStatus.style.color = '#4f4';
        } else {
            ethereumStatus.textContent = 'Not available ❌';
            ethereumStatus.style.color = '#f44';
        }
    }
    
    // Check ethers
    const ethersStatus = document.getElementById('debug-ethers');
    if (ethersStatus) {
        if (typeof window.ethers !== 'undefined') {
            ethersStatus.textContent = `Available (v${window.ethers.version}) ✅`;
            ethersStatus.style.color = '#4f4';
        } else {
            ethersStatus.textContent = 'Not available ❌';
            ethersStatus.style.color = '#f44';
        }
    }
    
    // Check contract utilities
    const contractStatus = document.getElementById('debug-contract');
    if (contractStatus) {
        if (window.contractUtils) {
            contractStatus.textContent = window.contractUtils.isInitialized ? 
                'Initialized ✅' : 'Available but not initialized ⚠️';
            contractStatus.style.color = window.contractUtils.isInitialized ? '#4f4' : '#ff4';
        } else {
            contractStatus.textContent = 'Not available ❌';
            contractStatus.style.color = '#f44';
        }
    }
    
    // Check network
    const networkStatus = document.getElementById('debug-network');
    if (networkStatus) {
        if (window.ethereum && typeof window.ethers !== 'undefined') {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                provider.getNetwork().then(network => {
                    networkStatus.textContent = `${network.name} (${network.chainId}) ✅`;
                    networkStatus.style.color = network.chainId === 11155111 ? '#4f4' : '#ff4';
                    
                    if (network.chainId !== 11155111) {
                        networkStatus.textContent += ' - Should be Sepolia (11155111) ⚠️';
                    }
                });
            } catch (error) {
                networkStatus.textContent = 'Error getting network ❌';
                networkStatus.style.color = '#f44';
            }
        } else {
            networkStatus.textContent = 'Cannot check (missing dependencies) ❌';
            networkStatus.style.color = '#f44';
        }
    }
    
    // Check contract address
    const addressStatus = document.getElementById('debug-address');
    if (addressStatus) {
        if (window.contractUtils && window.contractUtils.CONTRACT_ADDRESS) {
            addressStatus.textContent = `${window.contractUtils.CONTRACT_ADDRESS.substring(0, 6)}...${window.contractUtils.CONTRACT_ADDRESS.substring(38)} ✅`;
            addressStatus.style.color = '#4f4';
        } else {
            addressStatus.textContent = 'Not available ❌';
            addressStatus.style.color = '#f44';
        }
    }
}

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

// Add debug panel button to run direct loan checks
document.addEventListener('DOMContentLoaded', function() {
    // Create debug loan button if it doesn't exist
    setTimeout(() => {
        const debugPanel = document.querySelector('#debugPanel') || document.body;
        
        // Add loan debug button
        const loanDebugBtn = document.createElement('button');
        loanDebugBtn.innerText = 'Check Loans';
        loanDebugBtn.style.marginLeft = '5px';
        loanDebugBtn.style.padding = '5px 10px';
        loanDebugBtn.style.backgroundColor = '#553399';
        loanDebugBtn.style.color = 'white';
        loanDebugBtn.style.border = 'none';
        loanDebugBtn.style.borderRadius = '4px';
        loanDebugBtn.style.cursor = 'pointer';
        
        loanDebugBtn.addEventListener('click', async function() {
            console.log('----- LOAN DEBUG INFO -----');
            const result = await window.loanDebug.checkUserLoans();
            console.log('Loan Debug Results:', result);
            console.log('---------------------------');
            alert('Loan debug info logged to console. Press F12 to view.');
        });
        
        debugPanel.appendChild(loanDebugBtn);
    }, 2000);
}); 
