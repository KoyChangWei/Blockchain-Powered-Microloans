// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
const hre = require("hardhat");

async function main() {
  console.log("Deploying MicroLoanPlatform contract...");

  // Get the contract factory
  const MicroLoanPlatform = await hre.ethers.getContractFactory("MicroLoanPlatform");
  
  // Deploy the contract
  const microLoanPlatform = await MicroLoanPlatform.deploy();

  // Wait for the contract to be deployed
  await microLoanPlatform.waitForDeployment();

  // Get the contract address
  const contractAddress = await microLoanPlatform.getAddress();
  console.log("MicroLoanPlatform deployed to:", contractAddress);
  console.log("Owner address:", (await hre.ethers.getSigners())[0].address);

  // For verification purposes - wait before verification
  console.log("Waiting for block confirmations...");
  await microLoanPlatform.deploymentTransaction().wait(5);
  
  // Verify contract on Etherscan if not on a local network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan!");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }

  return {
    contractAddress,
    ownerAddress: (await hre.ethers.getSigners())[0].address
  };
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then((deployInfo) => {
    console.log("Deployment successful!");
    console.log("Contract Address:", deployInfo.contractAddress);
    console.log("Owner Address:", deployInfo.ownerAddress);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 