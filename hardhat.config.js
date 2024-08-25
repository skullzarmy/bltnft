require("@nomiclabs/hardhat-ethers");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    networks: {
        etherlink_testnet: {
            url: process.env.GHOSTNET_RPC_URL || "https://node.ghostnet.etherlink.com",
            chainId: 128123,
            accounts: [process.env.PRIVATE_KEY],
        },
        etherlink_mainnet: {
            url: process.env.MAINNET_RPC_URL || "https://node.mainnet.etherlink.com",
            chainId: 42793,
            accounts: [process.env.PRIVATE_KEY],
        },
    },
    paths: {
        artifacts: "./artifacts", // Optional: use the default artifacts path
        cache: "./cache", // Optional: use the default cache path
        sources: "./contracts", // Optional: use the default contracts path
        tests: "./test", // Optional: use the default tests path
    },
    solidity: {
        version: "0.8.17",
        settings: {
            viaIR: true, // Enable the viaIR option
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
};
