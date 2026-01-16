const hre = require("hardhat");

async function main() {
    console.log("Deploying TempoGM contract to Tempo Testnet...");

    const TempoGM = await hre.ethers.getContractFactory("TempoGM");
    const tempoGM = await TempoGM.deploy();

    await tempoGM.waitForDeployment();

    const address = await tempoGM.getAddress();
    console.log("✅ TempoGM deployed to:", address);
    console.log("\n📝 Update this address in src/main.ts:");
    console.log(`const GM_CONTRACT_ADDRESS = '${address}'`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
