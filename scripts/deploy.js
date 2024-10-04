// SPDX-License-Identifier: Apache-2.0
require("dotenv").config();
const { ethers } = require("hardhat");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Determine if we're deploying to testnet or mainnet
    const network = hre.network.name;
    const isMainnet = network === "etherlink_mainnet";
    const balance = await deployer.getBalance();
    console.log(`Wallet balance: ${ethers.utils.formatUnits(balance, 18)} XTZ`);

    // Fetch addresses from environment variables
    const lettuceAddress = validateAddress(
        isMainnet ? process.env.LETTUCE_MAINNET : process.env.LETTUCE_TESTNET,
        "Lettuce NFT"
    );
    const tomatoAddress = validateAddress(
        isMainnet ? process.env.TOMATO_MAINNET : process.env.TOMATO_TESTNET,
        "Tomato NFT"
    );
    const mayoAddress = validateAddress(isMainnet ? process.env.MAYO_MAINNET : process.env.MAYO_TESTNET, "Mayo Token");
    const baconAddress = validateAddress(
        isMainnet ? process.env.BACON_MAINNET : process.env.BACON_TESTNET,
        "Bacon Token"
    );
    const breadAddress = validateAddress(
        isMainnet ? process.env.BREAD_MAINNET : process.env.BREAD_TESTNET,
        "Bread Token"
    );

    // Fetch the payment recipient and admin address
    const paymentRecipient = validateAddress(process.env.PAYMENT_RECIPIENT, "Payment Recipient");
    const adminAddress = validateAddress(deployer.address, "Admin Address");

    // Fetch and validate minting and royalty parameters
    const maxMintable = validatePositiveNumber(process.env.MAX_MINTABLE, "Max Mintable");
    const lettuceRequired = validatePositiveNumber(process.env.LETTUCE_REQUIRED, "Lettuce Required");
    const tomatoRequired = validatePositiveNumber(process.env.TOMATO_REQUIRED, "Tomato Required");

    const royaltyRecipient = validateAddress(process.env.ROYALTY_RECIPIENT, "Royalty Recipient");
    const royaltyBps = validatePositiveNumber(process.env.ROYALTY_BPS, "Royalty BPS");

    // Validate and fetch costs
    const mayoCost = parseTokenCost(process.env.MAYO_COST, "Mayo Token");
    const baconCost = parseTokenCost(process.env.BACON_COST, "Bacon Token");
    const breadCost = parseTokenCost(process.env.BREAD_COST, "Bread Token");

    // Pin image to IPFS for the thumbnail
    const imageFilePath = "./images/blt.jpg"; // Path to your NFT image
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;
    const imageCID = await safelyPinFileToIPFS(imageFilePath, pinataApiKey, pinataSecretApiKey);

    // Check if image upload failed
    if (!imageCID) {
        throw new Error("Image upload to IPFS failed. Aborting deployment.");
    }

    console.log(`Image uploaded to IPFS with CID: ${imageCID}`);

    // Use this IPFS URL for the image in the contract
    const imageURI = `ipfs://${imageCID}`;

    // Fetch the contract factory
    const BLTNFT = await ethers.getContractFactory("CustomERC1155LazyMint");

    // Deploy the contract with the pinned image URI (thumbnailURI)
    const bltnft = await BLTNFT.deploy(
        adminAddress,
        "BLTNFT", // Name
        "BLT", // Symbol
        royaltyRecipient,
        royaltyBps,
        mayoAddress,
        mayoCost,
        baconAddress,
        baconCost,
        breadAddress,
        breadCost,
        lettuceAddress,
        tomatoAddress,
        paymentRecipient,
        lettuceRequired,
        tomatoRequired,
        maxMintable,
        imageURI // Pass the image URI (thumbnailURI) to the contract
    );

    await bltnft.deployed();
    console.log(`BLTNFT deployed to: ${bltnft.address} on ${network}`);
}

// Utility function to validate addresses
function validateAddress(address, label) {
    if (!ethers.utils.isAddress(address)) {
        throw new Error(`Invalid address for ${label}: ${address}`);
    }
    return address;
}

// Utility function to validate positive numbers
function validatePositiveNumber(value, label) {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
        throw new Error(`${label} must be a positive number. Received: ${value}`);
    }
    return num;
}

// Utility function to parse token costs (assumes 18 decimals)
function parseTokenCost(value, label) {
    try {
        return ethers.utils.parseUnits(value, 18); // Defaulting to 18 decimals
    } catch (error) {
        throw new Error(`Error parsing token cost for ${label}: ${value}`);
    }
}

// Utility function to pin a file to IPFS with error handling
async function safelyPinFileToIPFS(filePath, apiKey, secretApiKey) {
    try {
        const data = new FormData();
        data.append("file", fs.createReadStream(filePath));
        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data, {
            headers: {
                "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
                pinata_api_key: apiKey,
                pinata_secret_api_key: secretApiKey,
            },
        });
        return res.data.IpfsHash;
    } catch (error) {
        console.error("Error uploading file to IPFS:", error);
        return null;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
