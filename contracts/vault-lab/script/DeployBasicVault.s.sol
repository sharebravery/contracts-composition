// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {BasicVault} from "../src/BasicVault.sol";
import {MockAsset} from "../src/MockAsset.sol";

contract DeployBasicVault is Script {
    function run() external returns (MockAsset asset, BasicVault vault) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);
        asset = new MockAsset();
        vault = new BasicVault(asset, "Lab Vault Share", "lvSHARE");
        vm.stopBroadcast();

        console2.log("MockAsset", address(asset));
        console2.log("BasicVault", address(vault));
    }
}
