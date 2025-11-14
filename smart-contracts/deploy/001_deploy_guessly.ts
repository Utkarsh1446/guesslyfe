import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
  console.log("Starting deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId);

  // TODO: Replace with your actual contract deployment
  // Example:
  // const ContractFactory = await ethers.getContractFactory("YourContract");
  // const contract = await ContractFactory.deploy(constructorArgs);
  // await contract.waitForDeployment();
  // const contractAddress = await contract.getAddress();
  // console.log("Contract deployed to:", contractAddress);

  console.log("\nDeployment completed!");

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    // contracts: {
    //   YourContract: contractAddress,
    // },
  };

  console.log("\nDeployment Info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
