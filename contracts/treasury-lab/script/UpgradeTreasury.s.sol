// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {TreasuryV1} from "../src/TreasuryV1.sol";
import {TreasuryV2} from "../src/TreasuryV2.sol";

contract UpgradeTreasury is Script {
    function run() external returns (TreasuryV2 implementation) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address proxyAddress = vm.envAddress("TREASURY_PROXY");

        vm.startBroadcast(deployerPrivateKey);
        implementation = new TreasuryV2();
        TreasuryV1(payable(proxyAddress)).upgradeToAndCall(address(implementation), "");
        vm.stopBroadcast();

        console2.log("TreasuryV2 implementation", address(implementation));
        console2.log("Treasury proxy", proxyAddress);
    }
}
