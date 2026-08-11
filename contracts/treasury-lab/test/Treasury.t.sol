// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {TreasuryV1} from "../src/TreasuryV1.sol";
import {TreasuryV2} from "../src/TreasuryV2.sol";
import {MockTreasuryToken} from "../src/MockTreasuryToken.sol";

contract TreasuryTest is Test {
    uint256 internal constant DAILY_LIMIT = 5 ether;

    address internal admin = address(0xA11CE);
    address internal treasurer = address(0xB0B);
    address internal upgradeAdmin = address(0xC0DE);
    address internal recipient = address(0xD00D);
    address internal secondRecipient = address(0xE11E);
    address internal outsider = address(0xBAD);

    TreasuryV1 internal implementation;
    TreasuryV1 internal treasury;
    MockTreasuryToken internal token;

    function setUp() public {
        implementation = new TreasuryV1();
        bytes memory initData = abi.encodeCall(TreasuryV1.initialize, (admin, treasurer, upgradeAdmin, DAILY_LIMIT));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        treasury = TreasuryV1(payable(address(proxy)));
        token = new MockTreasuryToken();

        vm.deal(address(treasury), 20 ether);
        token.mint(address(treasury), 1_000 ether);
    }

    function testInitializeOnlyOnce() public {
        vm.expectRevert();
        treasury.initialize(admin, treasurer, upgradeAdmin, DAILY_LIMIT);
    }

    function testTreasurerCanPayEthWithinDailyLimit() public {
        uint256 beforeBalance = recipient.balance;

        vm.prank(treasurer);
        treasury.payETH(payable(recipient), 2 ether);

        assertEq(recipient.balance, beforeBalance + 2 ether);
        assertEq(treasury.spentToday(), 2 ether);
        assertEq(treasury.remainingDailyLimit(), 3 ether);
    }

    function testDailyLimitResetsAfterWindow() public {
        vm.prank(treasurer);
        treasury.payETH(payable(recipient), DAILY_LIMIT);

        vm.expectRevert();
        vm.prank(treasurer);
        treasury.payETH(payable(recipient), 1 wei);

        vm.warp(block.timestamp + 1 days);
        vm.prank(treasurer);
        treasury.payETH(payable(recipient), 1 ether);

        assertEq(treasury.spentToday(), 1 ether);
    }

    function testNonTreasurerCannotPay() public {
        vm.expectRevert();
        vm.prank(outsider);
        treasury.payETH(payable(recipient), 1 ether);
    }

    function testPauseBlocksDepositsAndPayments() public {
        vm.prank(admin);
        treasury.pause();

        vm.expectRevert();
        vm.deal(outsider, 1 ether);
        vm.prank(outsider);
        treasury.depositETH{value: 1 ether}();

        vm.expectRevert();
        vm.prank(treasurer);
        treasury.payETH(payable(recipient), 1 ether);

        vm.prank(admin);
        treasury.unpause();

        vm.prank(treasurer);
        treasury.payETH(payable(recipient), 1 ether);
    }

    function testErc20DepositAndPayment() public {
        token.mint(outsider, 100 ether);
        vm.startPrank(outsider);
        token.approve(address(treasury), 100 ether);
        treasury.depositERC20(token, 100 ether);
        vm.stopPrank();

        vm.prank(treasurer);
        treasury.payERC20(token, recipient, 2 ether);

        assertEq(token.balanceOf(address(treasury)), 1_098 ether);
        assertEq(token.balanceOf(recipient), 2 ether);
    }

    function testOnlyUpgradeAdminCanUpgradeAndStateIsPreserved() public {
        vm.prank(treasurer);
        treasury.payETH(payable(recipient), 2 ether);

        uint256 balanceBefore = address(treasury).balance;
        uint256 spentBefore = treasury.spentToday();

        TreasuryV2 implementationV2 = new TreasuryV2();

        vm.expectRevert();
        vm.prank(outsider);
        treasury.upgradeToAndCall(address(implementationV2), "");

        vm.prank(upgradeAdmin);
        treasury.upgradeToAndCall(address(implementationV2), "");

        TreasuryV2 upgraded = TreasuryV2(payable(address(treasury)));
        assertEq(upgraded.version(), 2);
        assertEq(address(upgraded).balance, balanceBefore);
        assertEq(upgraded.spentToday(), spentBefore);
        assertEq(upgraded.dailyLimit(), DAILY_LIMIT);
        assertTrue(upgraded.hasRole(upgraded.TREASURER_ROLE(), treasurer));
        assertTrue(upgraded.hasRole(upgraded.UPGRADE_ADMIN_ROLE(), upgradeAdmin));
    }

    function testV2AllowlistAndBatchPayment() public {
        TreasuryV2 implementationV2 = new TreasuryV2();
        vm.prank(upgradeAdmin);
        treasury.upgradeToAndCall(address(implementationV2), "");
        TreasuryV2 upgraded = TreasuryV2(payable(address(treasury)));

        vm.prank(admin);
        upgraded.setAllowlisted(recipient, true);
        vm.prank(admin);
        upgraded.setAllowlisted(secondRecipient, true);

        address[] memory recipients = new address[](2);
        recipients[0] = recipient;
        recipients[1] = secondRecipient;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1 ether;
        amounts[1] = 2 ether;

        vm.prank(treasurer);
        upgraded.batchPayETH(recipients, amounts);

        assertEq(recipient.balance, 1 ether);
        assertEq(secondRecipient.balance, 2 ether);

        vm.expectRevert();
        vm.prank(treasurer);
        upgraded.payETH(payable(outsider), 1 ether);
    }

    function testV2BatchRejectsMismatchedArrays() public {
        TreasuryV2 implementationV2 = new TreasuryV2();
        vm.prank(upgradeAdmin);
        treasury.upgradeToAndCall(address(implementationV2), "");
        TreasuryV2 upgraded = TreasuryV2(payable(address(treasury)));

        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](2);

        vm.expectRevert();
        vm.prank(treasurer);
        upgraded.batchPayETH(recipients, amounts);
    }
}
