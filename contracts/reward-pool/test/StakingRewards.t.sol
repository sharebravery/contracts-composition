// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {StakingRewards} from "../src/StakingRewards.sol";
import {MockRewardToken} from "../src/MockRewardToken.sol";
import {MockStakeToken} from "../src/MockStakeToken.sol";

contract StakingRewardsTest is Test {
    uint256 internal constant DURATION = 7 days;
    uint256 internal constant REWARD_AMOUNT = 700 ether;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    MockStakeToken internal stakeToken;
    MockRewardToken internal rewardToken;
    StakingRewards internal pool;

    function setUp() public {
        stakeToken = new MockStakeToken();
        rewardToken = new MockRewardToken();
        pool = new StakingRewards(stakeToken, rewardToken, DURATION);

        stakeToken.mint(alice, 1_000 ether);
        stakeToken.mint(bob, 1_000 ether);
        rewardToken.mint(address(pool), REWARD_AMOUNT * 3);
    }

    function testSingleUserAccruesAndClaimsTimeBasedRewards() public {
        vm.prank(alice);
        stakeToken.approve(address(pool), type(uint256).max);
        vm.prank(alice);
        pool.stake(100 ether);

        pool.notifyRewardAmount(REWARD_AMOUNT);
        vm.warp(block.timestamp + DURATION / 2);

        assertApproxEqAbs(pool.earned(alice), REWARD_AMOUNT / 2, 1e12);

        vm.prank(alice);
        pool.claim();
        assertApproxEqAbs(rewardToken.balanceOf(alice), REWARD_AMOUNT / 2, 1e12);
    }

    function testMultipleUsersArePaidAccordingToTimeAndShares() public {
        vm.prank(alice);
        stakeToken.approve(address(pool), type(uint256).max);
        vm.prank(bob);
        stakeToken.approve(address(pool), type(uint256).max);

        vm.prank(alice);
        pool.stake(100 ether);
        pool.notifyRewardAmount(REWARD_AMOUNT);

        vm.warp(block.timestamp + DURATION / 7);
        vm.prank(bob);
        pool.stake(100 ether);

        vm.warp(block.timestamp + DURATION / 7);
        assertApproxEqAbs(pool.earned(alice), 150 ether, 1e12);
        assertApproxEqAbs(pool.earned(bob), 50 ether, 1e12);
    }

    function testNewRewardPeriodMergesRemainingRewards() public {
        pool.notifyRewardAmount(REWARD_AMOUNT);
        uint256 initialRate = pool.rewardRate();

        vm.warp(block.timestamp + DURATION / 7);
        pool.notifyRewardAmount(REWARD_AMOUNT);

        uint256 leftover = (DURATION - DURATION / 7) * initialRate;
        assertEq(pool.rewardRate(), (REWARD_AMOUNT + leftover) / DURATION);
        assertEq(pool.periodFinish(), block.timestamp + DURATION);
    }

    function testInsufficientRewardBalanceCannotCreatePeriod() public {
        MockRewardToken emptyRewards = new MockRewardToken();
        StakingRewards emptyPool = new StakingRewards(stakeToken, emptyRewards, DURATION);

        vm.expectRevert(StakingRewards.InsufficientRewardBalance.selector);
        emptyPool.notifyRewardAmount(REWARD_AMOUNT);
    }

    function testPauseBlocksStakeButAllowsWithdrawClaimAndExit() public {
        vm.prank(alice);
        stakeToken.approve(address(pool), type(uint256).max);
        vm.prank(alice);
        pool.stake(100 ether);
        pool.notifyRewardAmount(REWARD_AMOUNT);
        vm.warp(block.timestamp + DURATION / 2);

        pool.pause();

        vm.expectRevert();
        vm.prank(bob);
        pool.stake(1 ether);

        vm.prank(alice);
        pool.withdraw(25 ether);
        vm.prank(alice);
        pool.claim();
        vm.prank(alice);
        pool.exit();

        assertEq(stakeToken.balanceOf(alice), 1_000 ether);
        assertGt(rewardToken.balanceOf(alice), 0);
    }

    function testExitWithdrawsEntireStakeAndClaimsRewards() public {
        vm.prank(alice);
        stakeToken.approve(address(pool), type(uint256).max);
        vm.prank(alice);
        pool.stake(100 ether);
        pool.notifyRewardAmount(REWARD_AMOUNT);
        vm.warp(block.timestamp + DURATION / 4);

        vm.prank(alice);
        pool.exit();

        assertEq(pool.balanceOf(alice), 0);
        assertEq(stakeToken.balanceOf(alice), 1_000 ether);
        assertApproxEqAbs(rewardToken.balanceOf(alice), REWARD_AMOUNT / 4, 1e12);
    }
}
