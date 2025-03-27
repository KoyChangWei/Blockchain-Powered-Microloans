// Start local environment for blockchain testing
const { spawn, execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║        Blockchain Microloan Platform - Local Env            ║");
console.log("╚════════════════════════════════════════════════════════════╝");

// Prepare hardhat node process
let hardhatNode = null;
let nodeStarted = false;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to start local Hardhat node
function startHardhatNode() {
  console.log("Starting local Hardhat node...");
  return new Promise((resolve, reject) => {
    hardhatNode = spawn('npx', ['hardhat', 'node'], { 
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true 
    });
    
    let dataBuffer = "";
    
    hardhatNode.stdout.on('data', (data) => {
      const output = data.toString();
      dataBuffer += output;
      
      // Check if node is ready by looking for the standard Hardhat message
      if (output.includes('Started HTTP and WebSocket JSON-RPC server at') && !nodeStarted) {
        nodeStarted = true;
        console.log("✅ Local Hardhat node started successfully!");
        resolve();
      }
      
      // Only log after we've captured the started message
      if (nodeStarted) {
        process.stdout.write(output);
      }
    });
    
    hardhatNode.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });
    
    hardhatNode.on('close', (code) => {
      if (code !== 0 && !nodeStarted) {
        reject(new Error(`Hardhat node process exited with code ${code}`));
      }
    });
    
    // If node doesn't start in 15 seconds, reject
    setTimeout(() => {
      if (!nodeStarted) {
        reject(new Error("Hardhat node failed to start in time"));
      }
    }, 15000);
  });
}

// Function to deploy the contract to local network
async function deployContract() {
  console.log("\nDeploying MicroLoanPlatform contract to local network...");
  
  try {
    execSync('npx hardhat run scripts/deploy-local.js --network localhost', { stdio: 'inherit' });
    console.log("✅ Contract deployed successfully!");
    return true;
  } catch (error) {
    console.error("❌ Failed to deploy contract:", error.message);
    return false;
  }
}

// Function to check if web server is needed
function askStartWebServer() {
  return new Promise((resolve) => {
    rl.question('\nDo you want to start a simple web server to run the application? (y/n): ', (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Function to start a simple web server
function startWebServer() {
  console.log("\nStarting a simple web server...");
  
  try {
    const serverProcess = spawn('npx', ['http-server', '.', '-p', '3000', '-c-1'], { 
      stdio: 'inherit',
      shell: true
    });
    
    console.log("✅ Web server started successfully! Open http://localhost:3000 in your browser.");
    
    return serverProcess;
  } catch (error) {
    console.error("❌ Failed to start web server:", error.message);
    console.log("You can still open the HTML files directly in your browser.");
    return null;
  }
}

// Clean up function for graceful shutdown
function cleanup() {
  console.log("\nShutting down...");
  
  if (hardhatNode) {
    // Kill the hardhat node
    hardhatNode.kill();
  }
  
  rl.close();
  process.exit(0);
}

// Handle cleanup on exit signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Main function
async function main() {
  try {
    // Step 1: Start local Hardhat node
    await startHardhatNode();
    
    // Step 2: Deploy contract
    const deploySuccess = await deployContract();
    
    if (!deploySuccess) {
      console.log("Continuing with the current configuration...");
    }
    
    // Step 3: Ask if web server is needed
    const startServer = await askStartWebServer();
    
    // Step 4: Start web server if requested
    let serverProcess = null;
    if (startServer) {
      serverProcess = startWebServer();
    } else {
      console.log("\nNo web server started. You can open the HTML files directly in your browser.");
      console.log("Make sure to connect MetaMask to http://localhost:8545 (Hardhat node)");
      console.log("Import a test account private key shown above to interact with the contract.");
    }
    
    // Keep the script running until user terminates
    console.log("\nPress Ctrl+C to stop all processes and exit.");
    
  } catch (error) {
    console.error("❌ Error in setup:", error.message);
    cleanup();
  }
}

// Run the main function
main(); 