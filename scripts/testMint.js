require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
    const [claimer] = await ethers.getSigners();

    const contractAddress = process.env.DEPLOYED_CONTRACT_ADDRESS;
    if (!contractAddress) {
        console.error(
            "Please provide a deployed contract address in the environment variable DEPLOYED_CONTRACT_ADDRESS"
        );
        process.exit(1);
    }

    // Attach using ethers.getContractAt to ensure correct ABI is used
    const bltnft = await ethers.getContractAt("CustomERC1155LazyMint", contractAddress);

    // Log the available contract methods for debugging
    console.log("Available contract methods:", bltnft.interface.functions);

    const mintable = await bltnft.mintable();
    if (!mintable) {
        console.error("Minting is not enabled. Please enable minting before proceeding.");
        process.exit(1);
    }

    const nextTokenId = await bltnft.nextTokenIdToMint();
    console.log("Next available token ID to mint:", nextTokenId.toString());

    const lettuceTokenIds = [1];
    const tomatoTokenIds = [1];
    const quantityToMint = 1;

    console.log(`Attempting to mint token ID: ${nextTokenId.toString()} with ${quantityToMint} quantity.`);

    try {
        const tx = await bltnft.claimBLT(
            claimer.address,
            nextTokenId,
            quantityToMint,
            lettuceTokenIds,
            tomatoTokenIds,
            { value: ethers.utils.parseEther("0.1"), gasLimit: 5000000 } // Example manual gas limit
        );
        await tx.wait();

        console.log(`Minting successful! Claimed ${quantityToMint} tokens with ID: ${nextTokenId.toString()}`);
    } catch (error) {
        console.error("Minting failed:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
