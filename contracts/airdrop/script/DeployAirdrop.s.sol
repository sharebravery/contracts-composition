// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {MerkleAirdrop} from "../src/MerkleAirdrop.sol";
import {MockLabToken} from "../src/MockLabToken.sol";

contract DeployAirdrop is Script {
    function run() external returns (MockLabToken token, MerkleAirdrop airdrop) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        bytes32 merkleRoot = vm.envBytes32("AIRDROP_MERKLE_ROOT");
        uint256 deadline = vm.envUint("AIRDROP_DEADLINE");
        uint256 fundingAmount = vm.envUint("AIRDROP_FUNDING_AMOUNT");

        vm.startBroadcast(deployerPrivateKey);
        token = new MockLabToken();
        airdrop = new MerkleAirdrop(token, merkleRoot, deadline);
        token.mint(address(airdrop), fundingAmount);
        vm.stopBroadcast();

        console2.log("MockLabToken", address(token));
        console2.log("MerkleAirdrop", address(airdrop));
        console2.logBytes32(merkleRoot);
        console2.logUint(deadline);
    }
}
