// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {TreasuryV1} from "../src/TreasuryV1.sol";
import {TreasuryV2} from "../src/TreasuryV2.sol";
import {MockTreasuryToken} from "../src/MockTreasuryToken.sol";

/// @notice Fuzzes the underflow fix: lowering `dailyLimit` below `spentToday` must never
/// revert `remainingDailyLimit()` or `_consumeDailyLimit`, and the remainder must be exact.
contract TreasuryLimitFuzzTest is Test {
    uint256 internal constant DAILY_LIMIT = 5 ether;

    address internal admin = address(0xA11CE);
    address internal treasurer = address(0xB0B);
    address internal recipient = address(0xD00D);
    TreasuryV1 internal treasury;

    function setUp() public {
        TreasuryV1 impl = new TreasuryV1();
        bytes memory initData = abi.encodeCall(TreasuryV1.initialize, (admin, treasurer, address(0xC0DE), DAILY_LIMIT));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        treasury = TreasuryV1(payable(address(proxy)));
        vm.deal(address(treasury), 1_000 ether);
    }

    function testFuzzRemainingNeverRevertsWhenLimitLowered(uint256 spent, uint256 newLimit) public {
        spent = bound(spent, 0, DAILY_LIMIT);
        newLimit = bound(newLimit, 1, type(uint128).max);

        if (spent > 0) {
            vm.prank(treasurer);
            treasury.payETH(payable(recipient), spent);
        }

        vm.prank(admin);
        treasury.setDailyLimit(newLimit);

        uint256 remaining = treasury.remainingDailyLimit();
        if (spent >= newLimit) {
            assertEq(remaining, 0);
        } else {
            assertEq(remaining, newLimit - spent);
        }
        assertLe(remaining, newLimit);
    }

    function testFuzzPayRespectsLoweredLimit(uint256 spent, uint256 newLimit, uint256 payment) public {
        spent = bound(spent, 0, DAILY_LIMIT);
        newLimit = bound(newLimit, 1, DAILY_LIMIT * 3);
        payment = bound(payment, 1, DAILY_LIMIT * 3);

        if (spent > 0) {
            vm.prank(treasurer);
            treasury.payETH(payable(recipient), spent);
        }
        vm.prank(admin);
        treasury.setDailyLimit(newLimit);

        uint256 remaining = treasury.remainingDailyLimit();
        if (payment > remaining) {
            vm.expectRevert(abi.encodeWithSelector(TreasuryV1.DailyLimitExceeded.selector, payment, remaining));
            vm.prank(treasurer);
            treasury.payETH(payable(recipient), payment);
        } else {
            vm.prank(treasurer);
            treasury.payETH(payable(recipient), payment);
            assertEq(treasury.spentToday(), spent + payment);
            assertEq(treasury.remainingDailyLimit(), remaining - payment);
        }
    }

    function testFuzzWindowRolloverResetsSpent(uint256 spent, uint256 timeJump) public {
        spent = bound(spent, 1, DAILY_LIMIT);
        timeJump = bound(timeJump, 1 days, 365 days);

        vm.prank(treasurer);
        treasury.payETH(payable(recipient), spent);
        assertEq(treasury.spentToday(), spent);

        vm.warp(block.timestamp + timeJump);

        // After the window rolls over, the full limit is available again.
        assertEq(treasury.remainingDailyLimit(), DAILY_LIMIT);
        vm.prank(treasurer);
        treasury.payETH(payable(recipient), DAILY_LIMIT);
        assertEq(treasury.spentToday(), DAILY_LIMIT);
    }
}

/// @notice Fuzzes V2 per-token ERC-20 limits: spending is tracked per token and independent
/// of ETH accounting; crossing the limit reverts with the exact remainder.
contract TreasuryErc20FuzzTest is Test {
    uint256 internal constant ETH_LIMIT = 5 ether;

    address internal admin = address(0xA11CE);
    address internal treasurer = address(0xB0B);
    address internal recipient = address(0xD00D);
    TreasuryV2 internal treasury;
    MockTreasuryToken internal tokenA;
    MockTreasuryToken internal tokenB;

    function setUp() public {
        address upgradeAdmin = address(0xC0DE);
        TreasuryV1 impl = new TreasuryV1();
        bytes memory initData = abi.encodeCall(TreasuryV1.initialize, (admin, treasurer, upgradeAdmin, ETH_LIMIT));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        TreasuryV2 implV2 = new TreasuryV2();
        vm.prank(upgradeAdmin);
        TreasuryV1(payable(address(proxy))).upgradeToAndCall(address(implV2), "");
        treasury = TreasuryV2(payable(address(proxy)));

        tokenA = new MockTreasuryToken();
        tokenB = new MockTreasuryToken();
        tokenA.mint(address(treasury), type(uint128).max);
        tokenB.mint(address(treasury), type(uint128).max);
        vm.deal(address(treasury), 1_000 ether);

        vm.prank(admin);
        treasury.setAllowlisted(recipient, true);
    }

    function testFuzzPerTokenLimitIsIndependent(uint256 limitA, uint256 limitB, uint256 payA, uint256 payB) public {
        limitA = bound(limitA, 1, type(uint96).max);
        limitB = bound(limitB, 1, type(uint96).max);
        payA = bound(payA, 0, limitA);
        payB = bound(payB, 0, limitB);

        vm.startPrank(admin);
        treasury.setERC20DailyLimit(tokenA, limitA);
        treasury.setERC20DailyLimit(tokenB, limitB);
        vm.stopPrank();

        if (payA > 0) {
            vm.prank(treasurer);
            treasury.payERC20(tokenA, recipient, payA);
        }
        if (payB > 0) {
            vm.prank(treasurer);
            treasury.payERC20(tokenB, recipient, payB);
        }

        assertEq(treasury.erc20SpentToday(tokenA), payA);
        assertEq(treasury.erc20SpentToday(tokenB), payB);
        assertEq(treasury.remainingERC20DailyLimit(tokenA), limitA - payA);
        assertEq(treasury.remainingERC20DailyLimit(tokenB), limitB - payB);
        // ETH accounting is untouched by ERC-20 payments.
        assertEq(treasury.spentToday(), 0);
        assertEq(treasury.remainingDailyLimit(), ETH_LIMIT);
    }

    function testFuzzErc20PaymentRevertsOverLimit(uint256 limit, uint256 pay1, uint256 pay2) public {
        limit = bound(limit, 1, type(uint96).max);
        pay1 = bound(pay1, 0, limit);
        pay2 = bound(pay2, 1, type(uint96).max);

        vm.prank(admin);
        treasury.setERC20DailyLimit(tokenA, limit);

        if (pay1 > 0) {
            vm.prank(treasurer);
            treasury.payERC20(tokenA, recipient, pay1);
        }

        uint256 remaining = limit - pay1;
        if (pay2 > remaining) {
            vm.expectRevert(abi.encodeWithSelector(TreasuryV1.DailyLimitExceeded.selector, pay2, remaining));
            vm.prank(treasurer);
            treasury.payERC20(tokenA, recipient, pay2);
        } else {
            vm.prank(treasurer);
            treasury.payERC20(tokenA, recipient, pay2);
            assertEq(treasury.erc20SpentToday(tokenA), pay1 + pay2);
        }
    }

    function testFuzzErc20LimitLoweredBelowSpentDoesNotRevert(uint256 limit, uint256 spent, uint256 newLimit) public {
        limit = bound(limit, 1, type(uint96).max);
        spent = bound(spent, 0, limit);
        newLimit = bound(newLimit, 1, type(uint96).max);

        vm.prank(admin);
        treasury.setERC20DailyLimit(tokenA, limit);
        if (spent > 0) {
            vm.prank(treasurer);
            treasury.payERC20(tokenA, recipient, spent);
        }

        vm.prank(admin);
        treasury.setERC20DailyLimit(tokenA, newLimit);

        uint256 remaining = treasury.remainingERC20DailyLimit(tokenA);
        if (spent >= newLimit) {
            assertEq(remaining, 0);
        } else {
            assertEq(remaining, newLimit - spent);
        }
    }
}
