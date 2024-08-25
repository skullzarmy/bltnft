# BLTNFT

BLTNFT is a custom ERC1155 contract that requires multiple ERC20 and ERC721 tokens for claiming new tokens. This project uses the Thirdweb SDK and is built on the Hardhat development framework.

## Features

-   **Custom ERC1155 Implementation**: Requires multiple ERC20 and ERC721 tokens to claim new tokens.
-   **Flexible Token Cost Configuration**: Adjust costs and requirements dynamically.
-   **Automated IPFS Uploads**: Easily upload images and metadata to IPFS via Pinata.

## Getting Started

### Prerequisites

Ensure you have the following installed:

-   Node.js
-   Yarn or npm
-   Hardhat

### Cloning the Project

To clone and set up this project locally, run the following commands:

```
git clone https://github.com/yourusername/BLTNFT.git
cd BLTNFT
npm install
```

### Environment Variables

Copy the `.env.example` file to `.env` and fill in the necessary environment variables:

```
cp .env.example .env
```

Edit the `.env` file and ensure the following variables are correctly set:

```
PRIVATE_KEY=your_private_key
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_api_key

LETTUCE_TESTNET=0xYourLettuceTestnetAddress
TOMATO_TESTNET=0xYourTomatoTestnetAddress
MAYO_TESTNET=0xYourMayoTestnetAddress
BACON_TESTNET=0xYourBaconTestnetAddress
BREAD_TESTNET=0xYourBreadTestnetAddress

LETTUCE_MAINNET=0xYourLettuceMainnetAddress
TOMATO_MAINNET=0xYourTomatoMainnetAddress
MAYO_MAINNET=0xYourMayoMainnetAddress
BACON_MAINNET=0xYourBaconMainnetAddress
BREAD_MAINNET=0xYourBreadMainnetAddress

MAYO_COST=1000000
BACON_COST=5000000
BREAD_COST=2000000

LETTUCE_REQUIRED=1
TOMATO_REQUIRED=1

ROYALTY_RECIPIENT=0xYourRoyaltyRecipientAddress
ROYALTY_BPS=1000
```

### Deploying Contracts

To deploy the contracts, run the following command:

```
npx hardhat run scripts/deploy.js --network etherlink_testnet
```

Make sure to specify the appropriate network (`etherlink_mainnet` or `etherlink_testnet`) depending on your environment.

## Project Structure

-   **contracts/**: Contains the Solidity contracts.
-   **scripts/**: Contains the deployment scripts.
-   **images/**: Contains images for the NFT metadata.
