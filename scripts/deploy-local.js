// Script to deploy the contract to a local Hardhat node and update the frontend configuration
const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Deploying MicroLoanPlatform contract to local network...");
  
  // Get the contract factory
  const MicroLoanPlatform = await hre.ethers.getContractFactory("MicroLoanPlatform");
  
  // Deploy the contract
  const microLoanPlatform = await MicroLoanPlatform.deploy();
  await microLoanPlatform.deployed();
  
  // Get the contract address
  const contractAddress = microLoanPlatform.address;
  console.log("MicroLoanPlatform deployed to:", contractAddress);
  
  // Get contract owner
  const [owner] = await hre.ethers.getSigners();
  console.log("Contract owner:", owner.address);
  
  // Get the contract ABI
  const artifactPath = path.join(__dirname, '../artifacts/contracts/MicroLoanPlatform.sol/MicroLoanPlatform.json');
  const contractArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const abi = contractArtifact.abi;
  
  // Update the contract.js file with the new address and ABI
  try {
    const contractJsPath = path.join(__dirname, '../js/contract.js');
    let contractJsContent = fs.readFileSync(contractJsPath, 'utf8');
    
    // Replace the contract address
    contractJsContent = contractJsContent.replace(
      /const CONTRACT_ADDRESS = ".*";/,
      `const CONTRACT_ADDRESS = "${contractAddress}";`
    );
    
    // Replace the contract ABI
    contractJsContent = contractJsContent.replace(
      /const CONTRACT_ABI = \[[\s\S]*?\];/,
      `const CONTRACT_ABI = ${JSON.stringify(abi, null, 2)};`
    );
    
    // Write the updated file
    fs.writeFileSync(contractJsPath, contractJsContent);
    console.log(`Updated contract.js with new address and ABI`);
  } catch (error) {
    console.error("Error updating contract.js:", error);
    console.log("Please manually update the CONTRACT_ADDRESS in js/contract.js to:", contractAddress);
  }
  
  // Log next steps
  console.log("\n==== DEPLOYMENT SUCCESSFUL ====");
  console.log(`Contract deployed to: ${contractAddress}`);
  console.log("Next steps:");
  console.log("1. Make sure your MetaMask is connected to the local network at http://localhost:8545");
  console.log("2. Import one of these test accounts into MetaMask:");
  console.log(`   - Owner: ${owner.address}`);
  console.log("   - Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("3. Open index.html in your browser and test the application");
  
  return {
    contractAddress,
    ownerAddress: owner.address
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((deployInfo) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 