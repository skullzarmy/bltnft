// SPDX-License-Identifier: Apache-2.0
require("dotenv").config();
const { ethers } = require("hardhat");
const { prepareContractCall, sendTransaction } = require("thirdweb");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Executing script with account:", deployer.address);

    // Determine the current network
    const network = hre.network.name;
    const isMainnet = network === "etherlink_mainnet";
    const balance = await deployer.getBalance();
    console.log(`Wallet balance: ${ethers.utils.formatUnits(balance, 18)} XTZ`);

    // Fetch staking contract and LP token addresses from .env
    const stakeContractAddress = validateAddress(
        isMainnet ? process.env.STAKE_CONTRACT_MAINNET : process.env.STAKE_CONTRACT_TESTNET,
        "Staking Contract"
    );
    const lpTokenAddress = validateAddress(
        isMainnet ? process.env.LP_TOKEN_MAINNET : process.env.LP_TOKEN_TESTNET,
        "LP Token"
    );

    // Attach to the LP Token contract using the IERC20 interface
    const lpTokenContract = await ethers.getContractAt("IERC20", lpTokenAddress, deployer);

    // Get the deployer's LP token balance
    const lpBalance = await lpTokenContract.balanceOf(deployer.address);
    console.log(`LP Token balance: ${ethers.utils.formatUnits(lpBalance, 18)} tokens`);

    // If the deployer has no tokens, stop the script
    if (lpBalance.isZero()) {
        console.log("No LP tokens to deposit. Exiting...");
        return;
    }

    console.log(`Approving ${ethers.utils.formatUnits(lpBalance, 18)} LP tokens to the staking contract...`);

    // Approve the staking contract to spend the LP tokens
    const approvalTx = await lpTokenContract.approve(stakeContractAddress, lpBalance);
    await approvalTx.wait();
    console.log("Approval transaction confirmed.");

    console.log("Depositing LP tokens into the staking contract...");

    // Manual ABI for StakeERC1155, replace this with actual ABI from your contract
    const stakeERC1155Abi = [
        // Minimal ABI required for depositRewardTokens, add other methods as needed
        "function depositRewardTokens(uint256 _amount) payable",
    ];

    // Attach to the staking contract using the manually provided ABI
    const stakeContract = new ethers.Contract(stakeContractAddress, stakeERC1155Abi, deployer);

    // Prepare and send the deposit transaction using thirdweb utilities
    const transaction = await prepareContractCall({
        contract: stakeContract,
        method: "depositRewardTokens",
        params: [lpBalance], // Depositing the entire balance
    });

    const { transactionHash } = await sendTransaction({
        transaction,
        account: deployer.address,
    });

    console.log(`Transaction successful with hash: ${transactionHash}`);
}

// Utility function to validate addresses
function validateAddress(address, label) {
    if (!ethers.utils.isAddress(address)) {
        throw new Error(`Invalid address for ${label}: ${address}`);
    }
    return address;
}

// Start the script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error in script execution:", error);
        process.exit(1);
    });
