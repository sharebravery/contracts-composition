// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {StakingRewards} from "../src/StakingRewards.sol";
import {MockStakeToken} from "../src/MockStakeToken.sol";
import {MockRewardToken} from "../src/MockRewardToken.sol";

/// @dev Adversarial ERC-20 that burns a 10% fee on every non-mint transfer, including
/// `transferFrom`. Used to prove `stake()` credits the amount actually received.
contract FeeOnTransferToken is ERC20 {
    uint256 public constant FEE_BPS = 1000; // 10%

    constructor() ERC20("Fee On Transfer Token", "FOT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = (value * FEE_BPS) / 10000;
            super._update(from, address(0), fee); // burn the fee
            super._update(from, to, value - fee);
        } else {
            super._update(from, to, value);
        }
    }
}

contract StakingRewardsSecurityTest is Test {
    uint256 internal constant DURATION = 7 days;
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function testStakeCreditsActualReceivedForFeeOnTransferToken() public {
        FeeOnTransferToken stakeToken = new FeeOnTransferToken();
        MockRewardToken rewardToken = new MockRewardToken();
        StakingRewards pool = new StakingRewards(stakeToken, rewardToken, DURATION);

        stakeToken.mint(alice, 100 ether);
        rewardToken.mint(address(pool), 700 ether);

        vm.startPrank(alice);
        stakeToken.approve(address(pool), 100 ether);
        pool.stake(100 ether);
        vm.stopPrank();

        // 10% fee burned on deposit -> only 90 credits issued and 90 held.
        assertEq(pool.balanceOf(alice), 90 ether);
        assertEq(pool.totalSupply(), 90 ether);
        assertEq(stakeToken.balanceOf(address(pool)), 90 ether);

        // Without the fix this would be 100, letting alice withdraw 10 of bob's principal.
        vm.prank(alice);
        pool.withdraw(90 ether);
        assertEq(stakeToken.balanceOf(alice), 90 ether - 9 ether); // 10% fee on withdrawal too
        assertEq(pool.totalSupply(), 0);
        assertEq(stakeToken.balanceOf(address(pool)), 0);
    }

    function testFeeOnTransferStakeKeepsPoolSolvent(uint256 aliceStake, uint256 bobStake) public {
        FeeOnTransferToken stakeToken = new FeeOnTransferToken();
        MockRewardToken rewardToken = new MockRewardToken();
        StakingRewards pool = new StakingRewards(stakeToken, rewardToken, DURATION);

        aliceStake = bound(aliceStake, 1 ether, 1000 ether);
        bobStake = bound(bobStake, 1 ether, 1000 ether);

        stakeToken.mint(alice, aliceStake);
        stakeToken.mint(bob, bobStake);

        vm.prank(alice);
        stakeToken.approve(address(pool), aliceStake);
        vm.prank(alice);
        pool.stake(aliceStake);
        vm.prank(bob);
        stakeToken.approve(address(pool), bobStake);
        vm.prank(bob);
        pool.stake(bobStake);

        // Credit issued never exceeds real holdings, even with fee-on-transfer tokens.
        assertLe(pool.totalSupply(), stakeToken.balanceOf(address(pool)));
    }

    function testSameTokenNotifyExcludesPrincipalFromRewardBacking() public {
        MockStakeToken token = new MockStakeToken();
        StakingRewards pool = new StakingRewards(token, token, DURATION);

        uint256 reward = 700 ether;
        uint256 principal = 100 ether;

        token.mint(address(pool), reward);
        token.mint(alice, principal);
        vm.startPrank(alice);
        token.approve(address(pool), principal);
        pool.stake(principal);
        vm.stopPrank();

        // available = balance(800) - totalSupply(100) = 700. Promising 800 would dip
        // into principal and is rejected; promising 700 (the real backing) is accepted.
        vm.expectRevert(StakingRewards.InsufficientRewardBalance.selector);
        pool.notifyRewardAmount(reward + principal);

        pool.notifyRewardAmount(reward);
        assertEq(pool.rewardRate(), reward / DURATION);
    }

    function testSameTokenClaimsDoNotDrainPrincipal() public {
        MockStakeToken token = new MockStakeToken();
        StakingRewards pool = new StakingRewards(token, token, DURATION);

        uint256 reward = 700 ether;
        uint256 principal = 100 ether;

        token.mint(address(pool), reward);
        token.mint(alice, principal);
        vm.startPrank(alice);
        token.approve(address(pool), principal);
        pool.stake(principal);
        vm.stopPrank();

        pool.notifyRewardAmount(reward);
        vm.warp(block.timestamp + DURATION);

        // Alice earned the full reward (within reward-per-token rounding); her principal
        // is returned and nothing more - she cannot drain the 100 principal as extra reward.
        vm.prank(alice);
        pool.exit();

        assertApproxEqAbs(token.balanceOf(alice), principal + reward, 1e12);
        assertLe(token.balanceOf(alice), principal + reward, "must not drain principal as extra reward");
        assertEq(pool.totalSupply(), 0);
        assertLt(token.balanceOf(address(pool)), 1e12, "only rounding dust may remain");
    }

    function testDifferentTokensUseFullBalanceAsBacking() public {
        // Sanity: when stake != reward token, the original balance check still applies
        // (no principal to exclude), so funding == reward is accepted.
        MockStakeToken stakeToken = new MockStakeToken();
        MockRewardToken rewardToken = new MockRewardToken();
        StakingRewards pool = new StakingRewards(stakeToken, rewardToken, DURATION);

        rewardToken.mint(address(pool), 700 ether);
        pool.notifyRewardAmount(700 ether);
        assertEq(pool.rewardRate(), 700 ether / DURATION);
    }
}
