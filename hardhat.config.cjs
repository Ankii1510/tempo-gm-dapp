require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.20",
    networks: {
        tempo: {
            url: "https://rpc.moderato.tempo.xyz",
            chainId: 42431,
            accounts: []
        }
    }
};
