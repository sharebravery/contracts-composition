// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {TreasuryV1} from "../src/TreasuryV1.sol";
import {TreasuryV2} from "../src/TreasuryV2.sol";
import {MockTreasuryToken} from "../src/MockTreasuryToken.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Validates the V1 -> V2 upgrade path beyond a layout print: state that V1 wrote
/// (balances, roles, ETH limit accounting) must survive the upgrade, and V2's per-asset
/// ERC-20 limits + allowlist must become usable without disturbing V1's ETH accounting.
contract TreasuryUpgradeTest is Test {
    uint256 internal constant DAILY_LIMIT = 5 ether;

    address internal admin = address(0xA11CE);
    address internal treasurer = address(0xB0B);
    address internal upgradeAdmin = address(0xC0DE);
    address internal recipient = address(0xD00D);
    address internal outsider = address(0xBAD);

    TreasuryV1 internal treasury;
    MockTreasuryToken internal token;

    function setUp() public {
        TreasuryV1 impl = new TreasuryV1();
        bytes memory initData = abi.encodeCall(TreasuryV1.initialize, (admin, treasurer, upgradeAdmin, DAILY_LIMIT));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        treasury = TreasuryV1(payable(address(proxy)));
        token = new MockTreasuryToken();

        vm.deal(address(treasury), 20 ether);
        token.mint(address(treasury), 1_000 ether);

        // Consume part of the ETH window so we can prove it survives the upgrade.
        vm.prank(treasurer);
        treasury.payETH(payable(recipient), 2 ether);
    }

    function testUpgradePreservesV1StateAndEnablesV2Features() public {
        uint256 ethBalanceBefore = address(treasury).balance;
        uint256 spentBefore = treasury.spentToday();
        uint256 dayStartBefore = treasury.dayStart();
        uint256 dailyLimitBefore = treasury.dailyLimit();
        uint256 tokenBalanceBefore = token.balanceOf(address(treasury));

        // Non upgrade-admin cannot upgrade.
        TreasuryV2 implV2 = new TreasuryV2();
        vm.expectRevert();
        vm.prank(outsider);
        treasury.upgradeToAndCall(address(implV2), "");

        vm.prank(upgradeAdmin);
        treasury.upgradeToAndCall(address(implV2), "");

        TreasuryV2 upgraded = TreasuryV2(payable(address(treasury)));

        // V1 state is preserved exactly.
        assertEq(upgraded.version(), 2);
        assertEq(address(upgraded).balance, ethBalanceBefore);
        assertEq(upgraded.spentToday(), spentBefore);
        assertEq(upgraded.dayStart(), dayStartBefore);
        assertEq(upgraded.dailyLimit(), dailyLimitBefore);
        assertEq(token.balanceOf(address(upgraded)), tokenBalanceBefore);
        assertTrue(upgraded.hasRole(upgraded.TREASURER_ROLE(), treasurer));
        assertTrue(upgraded.hasRole(upgraded.UPGRADE_ADMIN_ROLE(), upgradeAdmin));
        assertTrue(upgraded.hasRole(upgraded.DEFAULT_ADMIN_ROLE(), admin));

        // ETH accounting carries over with no migration: 5 - 2 = 3 ETH remaining.
        assertEq(upgraded.remainingDailyLimit(), 3 ether);

        // V2 allowlist + per-token ERC-20 limit are usable.
        vm.prank(admin);
        upgraded.setAllowlisted(recipient, true);
        vm.prank(admin);
        upgraded.setERC20DailyLimit(token, 10 ether);

        assertEq(upgraded.erc20DailyLimit(token), 10 ether);
        assertEq(upgraded.remainingERC20DailyLimit(token), 10 ether);

        // ERC-20 payments consume the per-token limit, not the ETH limit.
        vm.prank(treasurer);
        upgraded.payERC20(token, recipient, 4 ether);
        assertEq(upgraded.erc20SpentToday(token), 4 ether);
        assertEq(upgraded.remainingERC20DailyLimit(token), 6 ether);
        assertEq(upgraded.spentToday(), spentBefore, "ETH accounting must not move on ERC-20 payment");
    }

    function testErc20PaymentsBlockedUntilLimitConfigured() public {
        TreasuryV2 implV2 = new TreasuryV2();
        vm.prank(upgradeAdmin);
        treasury.upgradeToAndCall(address(implV2), "");
        TreasuryV2 upgraded = TreasuryV2(payable(address(treasury)));

        vm.prank(admin);
        upgraded.setAllowlisted(recipient, true);

        // Default per-token limit is zero -> payment reverts (safe opt-in).
        vm.expectRevert(abi.encodeWithSelector(TreasuryV1.DailyLimitExceeded.selector, 1 ether, 0));
        vm.prank(treasurer);
        upgraded.payERC20(token, recipient, 1 ether);
    }

    function testLoweringEthLimitBelowSpentDoesNotBrickAfterUpgrade() public {
        TreasuryV2 implV2 = new TreasuryV2();
        vm.prank(upgradeAdmin);
        treasury.upgradeToAndCall(address(implV2), "");
        TreasuryV2 upgraded = TreasuryV2(payable(address(treasury)));

        vm.prank(admin);
        upgraded.setAllowlisted(recipient, true);

        // spentToday == 2 ether; lower the limit below it.
        vm.prank(admin);
        upgraded.setDailyLimit(1 ether);

        // View must not revert and must report zero remaining.
        assertEq(upgraded.remainingDailyLimit(), 0);
        // Payment is rejected cleanly, not via underflow.
        vm.expectRevert(abi.encodeWithSelector(TreasuryV1.DailyLimitExceeded.selector, 1 ether, 0));
        vm.prank(treasurer);
        upgraded.payETH(payable(recipient), 1 ether);

        // After the window rolls over, the new limit takes effect.
        vm.warp(block.timestamp + 1 days);
        assertEq(upgraded.remainingDailyLimit(), 1 ether);
        vm.prank(treasurer);
        upgraded.payETH(payable(recipient), 1 ether);
        assertEq(upgraded.spentToday(), 1 ether);
    }

    function testSetERC20DailyLimitRejectsZeroAndNative() public {
        TreasuryV2 implV2 = new TreasuryV2();
        vm.prank(upgradeAdmin);
        treasury.upgradeToAndCall(address(implV2), "");
        TreasuryV2 upgraded = TreasuryV2(payable(address(treasury)));

        vm.expectRevert(TreasuryV1.InvalidAmount.selector);
        vm.prank(admin);
        upgraded.setERC20DailyLimit(token, 0);

        // address(0) represents ETH and must use setDailyLimit.
        vm.expectRevert(TreasuryV1.InvalidRecipient.selector);
        vm.prank(admin);
        upgraded.setERC20DailyLimit(IERC20(address(0)), 5 ether);
    }
}
