// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {TreasuryV1} from "../src/TreasuryV1.sol";

contract DeployTreasury is Script {
    function run() external returns (TreasuryV1 implementation, ERC1967Proxy proxy) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address admin = vm.envAddress("TREASURY_ADMIN");
        address treasurer = vm.envAddress("TREASURY_TREASURER");
        address upgradeAdmin = vm.envAddress("TREASURY_UPGRADE_ADMIN");
        uint256 dailyLimit = vm.envUint("TREASURY_DAILY_LIMIT");

        vm.startBroadcast(deployerPrivateKey);
        implementation = new TreasuryV1();
        bytes memory initData = abi.encodeCall(TreasuryV1.initialize, (admin, treasurer, upgradeAdmin, dailyLimit));
        proxy = new ERC1967Proxy(address(implementation), initData);
        vm.stopBroadcast();

        console2.log("TreasuryV1 implementation", address(implementation));
        console2.log("Treasury proxy", address(proxy));
        console2.log("Daily limit", dailyLimit);
    }
}
