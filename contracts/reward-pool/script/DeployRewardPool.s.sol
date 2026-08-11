// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {StakingRewards} from "../src/StakingRewards.sol";
import {MockRewardToken} from "../src/MockRewardToken.sol";
import {MockStakeToken} from "../src/MockStakeToken.sol";

contract DeployRewardPool is Script {
    function run() external returns (MockStakeToken stakeToken, MockRewardToken rewardToken, StakingRewards pool) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 rewardFunding = vm.envUint("REWARD_FUNDING_AMOUNT");
        uint256 rewardDuration = vm.envUint("REWARD_DURATION");

        vm.startBroadcast(deployerPrivateKey);
        stakeToken = new MockStakeToken();
        rewardToken = new MockRewardToken();
        pool = new StakingRewards(stakeToken, rewardToken, rewardDuration);
        rewardToken.mint(address(pool), rewardFunding);
        pool.notifyRewardAmount(rewardFunding);
        vm.stopBroadcast();

        console2.log("MockStakeToken", address(stakeToken));
        console2.log("MockRewardToken", address(rewardToken));
        console2.log("StakingRewards", address(pool));
        console2.logUint(rewardDuration);
        console2.logUint(rewardFunding);
    }
}
