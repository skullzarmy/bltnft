require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
    // Fetch signer (admin)
    const [deployer] = await ethers.getSigners();

    // Fetch the deployed contract address
    const contractAddress = process.env.DEPLOYED_CONTRACT_ADDRESS;
    if (!contractAddress) {
        console.error(
            "Please provide a deployed contract address in the environment variable DEPLOYED_CONTRACT_ADDRESS"
        );
        process.exit(1);
    }

    // Fetch the ABI and contract factory
    const BLTNFT = await ethers.getContractFactory("CustomERC1155LazyMint");

    // Attach the deployed contract
    const bltnft = await BLTNFT.attach(contractAddress);

    const currentMintableState = await bltnft.mintable();
    console.log("Current mintable state:", currentMintableState);
    if (currentMintableState) {
        console.log("Minting is already enabled. Exiting...");
        return;
    }

    const adminRole = await bltnft.hasRole(ethers.constants.HashZero, deployer.address); // HashZero is DEFAULT_ADMIN_ROLE
    console.log("Deployer address:", deployer.address);
    console.log("Is the deployer admin:", adminRole);
    if (!adminRole) {
        console.error("You must be an admin to enable minting. Exiting...");
        return;
    }

    // Enable minting
    console.log(`Enabling minting on contract: ${contractAddress}`);
    const tx = await bltnft.setMintable(true); // You can adjust this value as needed
    await tx.wait();

    console.log("Minting has been enabled successfully.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
