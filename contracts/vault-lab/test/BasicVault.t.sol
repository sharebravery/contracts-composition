// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {BasicVault} from "../src/BasicVault.sol";
import {MockAsset} from "../src/MockAsset.sol";

contract BasicVaultTest is Test {
    uint256 internal constant INITIAL_ASSETS = 100 ether;

    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    MockAsset internal asset;
    BasicVault internal vault;

    function setUp() public {
        asset = new MockAsset();
        vault = new BasicVault(asset, "Lab Vault Share", "lvSHARE");

        asset.mint(alice, 10_000 ether);
        asset.mint(bob, 10_000 ether);

        vm.prank(alice);
        asset.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        asset.approve(address(vault), type(uint256).max);
    }

    function testDepositAndMintMatchPreview() public {
        uint256 depositAssets = 100 ether;
        uint256 expectedDepositShares = vault.previewDeposit(depositAssets);

        vm.prank(alice);
        uint256 depositShares = vault.deposit(depositAssets, alice);

        assertEq(depositShares, expectedDepositShares);
        assertEq(vault.balanceOf(alice), expectedDepositShares);

        uint256 mintShares = 25 ether;
        uint256 expectedMintAssets = vault.previewMint(mintShares);

        vm.prank(bob);
        uint256 mintAssets = vault.mint(mintShares, bob);

        assertEq(mintAssets, expectedMintAssets);
        assertEq(vault.balanceOf(bob), mintShares);
    }

    function testWithdrawAndRedeemReturnAssetsAccordingToPreview() public {
        vm.prank(alice);
        vault.deposit(INITIAL_ASSETS, alice);

        uint256 withdrawAssets = 25 ether;
        uint256 expectedWithdrawShares = vault.previewWithdraw(withdrawAssets);
        uint256 aliceAssetsBefore = asset.balanceOf(alice);

        vm.prank(alice);
        uint256 withdrawShares = vault.withdraw(withdrawAssets, alice, alice);

        assertEq(withdrawShares, expectedWithdrawShares);
        assertEq(asset.balanceOf(alice), aliceAssetsBefore + withdrawAssets);

        uint256 redeemShares = vault.balanceOf(alice) / 2;
        uint256 expectedRedeemAssets = vault.previewRedeem(redeemShares);

        vm.prank(alice);
        uint256 redeemAssets = vault.redeem(redeemShares, alice, alice);

        assertEq(redeemAssets, expectedRedeemAssets);
    }

    function testPreviewRoundingFollowsErc4626Direction() public {
        vm.prank(alice);
        vault.deposit(INITIAL_ASSETS, alice);
        asset.mint(address(vault), 37 ether);

        uint256 assets = 1 ether + 1;
        uint256 shares = vault.previewDeposit(assets);
        uint256 mintAssets = vault.previewMint(shares + 1);

        assertLe(shares, vault.convertToShares(assets));
        assertGe(mintAssets, vault.convertToAssets(shares + 1));
        assertEq(vault.previewWithdraw(assets), vault.convertToShares(assets) + 1);
    }

    function testDonationCannotZeroOutSubsequentDeposit() public {
        vm.prank(alice);
        vault.deposit(1 ether, alice);

        asset.mint(address(vault), 1_000 ether);

        uint256 victimShares = vault.previewDeposit(1 ether);
        assertGt(victimShares, 0);

        vm.prank(bob);
        uint256 mintedShares = vault.deposit(1 ether, bob);
        assertEq(mintedShares, victimShares);

        assertGe(vault.previewRedeem(mintedShares), 0.99 ether);
    }

    function testDonationYieldIncreasesSharePrice() public {
        vm.prank(alice);
        vault.deposit(INITIAL_ASSETS, alice);

        uint256 assetsBefore = vault.previewRedeem(vault.balanceOf(alice));
        asset.mint(address(vault), 20 ether);
        uint256 assetsAfter = vault.previewRedeem(vault.balanceOf(alice));

        assertEq(vault.totalAssets(), INITIAL_ASSETS + 20 ether);
        assertGt(assetsAfter, assetsBefore);
    }

    function testPauseBlocksDepositAndMintButAllowsWithdrawAndRedeem() public {
        vm.prank(alice);
        vault.deposit(INITIAL_ASSETS, alice);

        vault.pause();

        vm.expectRevert();
        vm.prank(bob);
        vault.deposit(1 ether, bob);

        vm.expectRevert();
        vm.prank(bob);
        vault.mint(1 ether, bob);

        vm.prank(alice);
        vault.withdraw(10 ether, alice, alice);

        uint256 remainingShares = vault.balanceOf(alice);
        vm.prank(alice);
        vault.redeem(remainingShares, alice, alice);

        assertEq(vault.balanceOf(alice), 0);
    }

    function testOnlyOwnerCanPause() public {
        vm.expectRevert();
        vm.prank(alice);
        vault.pause();
    }
}
