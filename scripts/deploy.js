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

    // Fetch contract addresses from environment variables
    const lettuceAddress = isMainnet ? process.env.LETTUCE_MAINNET : process.env.LETTUCE_TESTNET;
    const tomatoAddress = isMainnet ? process.env.TOMATO_MAINNET : process.env.TOMATO_TESTNET;
    const mayoAddress = isMainnet ? process.env.MAYO_MAINNET : process.env.MAYO_TESTNET;
    const baconAddress = isMainnet ? process.env.BACON_MAINNET : process.env.BACON_TESTNET;
    const breadAddress = isMainnet ? process.env.BREAD_MAINNET : process.env.BREAD_TESTNET;

    // Fetch the payment recipient
    const paymentRecipient = process.env.PAYMENT_RECIPIENT;

    // Validate addresses
    const addresses = {
        lettuceAddress,
        tomatoAddress,
        mayoAddress,
        baconAddress,
        breadAddress,
        paymentRecipient,
    };

    for (const [name, address] of Object.entries(addresses)) {
        if (!ethers.utils.isAddress(address)) {
            throw new Error(`Invalid address for ${name}: ${address}`);
        }
    }

    // Fetch initial prices directly from environment variables
    const mayoCost = ethers.utils.parseUnits(process.env.MAYO_COST, 18); // Assuming token has 18 decimals
    const baconCost = ethers.utils.parseUnits(process.env.BACON_COST, 18); // Assuming token has 18 decimals
    const breadCost = ethers.utils.parseUnits(process.env.BREAD_COST, 18); // Assuming token has 18 decimals

    // Fetch initial NFT burn requirements from environment variables
    const lettuceRequired = process.env.LETTUCE_REQUIRED;
    const tomatoRequired = process.env.TOMATO_REQUIRED;

    // Fetch the initial royalty recipient and royalty BPS from environment variables
    const royaltyRecipient = process.env.ROYALTY_RECIPIENT;
    const royaltyBps = process.env.ROYALTY_BPS;

    // Ensure all required variables are defined
    if (!royaltyRecipient || !royaltyBps) {
        throw new Error("Missing royaltyRecipient or royaltyBps environment variables");
    }

    // Metadata and image for the NFT
    const nftName = "BLTNFT";
    const nftSymbol = "BLT"; // Symbol for the NFT
    const nftDescription =
        "A delicious BLT made from Lettuce, Tomato, Mayo, Bacon, and Bread. The shining star of any sandwich shop! Look at you, you go getter you! You're a sandwich artist!";
    const imageFilePath = "./images/blt.jpg"; // Path to your NFT image

    // Pinata API Keys
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataSecretApiKey = process.env.PINATA_SECRET_API_KEY;

    // Upload image to IPFS via Pinata
    const imageCID = await pinFileToIPFS(imageFilePath, pinataApiKey, pinataSecretApiKey);
    console.log(`Image uploaded to IPFS with CID: ${imageCID}`);

    // Create and upload metadata to IPFS via Pinata
    const metadata = {
        name: nftName,
        description: nftDescription,
        image: `ipfs://${imageCID}`,
    };
    const metadataCID = await pinJSONToIPFS(metadata, pinataApiKey, pinataSecretApiKey);
    console.log(`Metadata uploaded to IPFS with CID: ${metadataCID}`);

    // Fetch the contract factory
    const BLTNFT = await ethers.getContractFactory("CustomERC1155LazyMint");

    // Deploy the contract
    const bltnft = await BLTNFT.deploy(
        deployer.address, // Admin address
        nftName, // Name
        nftSymbol, // Symbol
        royaltyRecipient, // Royalty recipient
        royaltyBps, // Royalty BPS
        mayoAddress, // MAYO Token address
        mayoCost, // MAYO Token cost
        baconAddress, // BACON Token address
        baconCost, // BACON Token cost
        breadAddress, // BREAD Token address
        breadCost, // BREAD Token cost
        lettuceAddress, // Lettuce NFT address
        tomatoAddress, // Tomato NFT address
        paymentRecipient, // Payment recipient
        lettuceRequired, // Initial Lettuce NFTs required
        tomatoRequired // Initial Tomato NFTs required
    );

    await bltnft.deployed();

    console.log(`BLTNFT deployed to: ${bltnft.address} on ${network}`);
}

async function pinFileToIPFS(filePath, apiKey, secretApiKey) {
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
}

async function pinJSONToIPFS(json, apiKey, secretApiKey) {
    const res = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", json, {
        headers: {
            "Content-Type": "application/json",
            pinata_api_key: apiKey,
            pinata_secret_api_key: secretApiKey,
        },
    });

    return res.data.IpfsHash;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
