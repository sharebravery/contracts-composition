// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {BasicVault} from "../src/BasicVault.sol";
import {MockAsset} from "../src/MockAsset.sol";

/// @notice Fuzzes ERC-4626 preview/rounding consistency and donation/inflation behavior.
contract BasicVaultFuzzTest is Test {
    MockAsset internal asset;
    BasicVault internal vault;
    address internal alice = address(0xA11CE);

    function setUp() public {
        asset = new MockAsset();
        vault = new BasicVault(asset, "Lab Vault Share", "lvSHARE");
        // Large balance so fuzzed deposits/mints never hit an ERC-20 balance ceiling.
        asset.mint(alice, 1e30);
        vm.prank(alice);
        asset.approve(address(vault), type(uint256).max);
    }

    function testFuzzDepositMintsExactlyPreview(uint256 assets) public {
        assets = bound(assets, 1, 1e27);
        uint256 preview = vault.previewDeposit(assets);

        vm.prank(alice);
        uint256 shares = vault.deposit(assets, alice);

        assertEq(shares, preview);
        assertEq(vault.balanceOf(alice), preview);
    }

    function testFuzzMintCostsExactlyPreview(uint256 shares) public {
        shares = bound(shares, 1, 1e27);
        uint256 preview = vault.previewMint(shares);

        vm.prank(alice);
        uint256 assets = vault.mint(shares, alice);

        assertEq(assets, preview);
        assertEq(vault.balanceOf(alice), shares);
    }

    function testFuzzRoundTripMintThenDeposit(uint256 shares) public {
        shares = bound(shares, 1, 1e27);
        vm.prank(alice);
        vault.deposit(1 ether, alice); // seed so the vault is non-empty

        uint256 assets = vault.previewMint(shares);
        uint256 backShares = vault.previewDeposit(assets);

        // mint rounds assets up, deposit rounds shares down: depositing the mint cost
        // yields at least the requested shares (ERC-4626 round-trip favors the vault).
        assertGe(backShares, shares);
    }

    function testFuzzRoundTripDepositThenMint(uint256 assets) public {
        assets = bound(assets, 1, 1e27);
        vm.prank(alice);
        vault.deposit(1 ether, alice);

        uint256 shares = vault.previewDeposit(assets);
        uint256 backAssets = vault.previewMint(shares);

        // deposit rounds shares down, mint rounds assets up: minting the deposited shares
        // costs at most the original assets.
        assertLe(backAssets, assets);
    }

    function testFuzzWithdrawAndRedeemMatchPreview(uint256 assetsIn) public {
        assetsIn = bound(assetsIn, 1 ether, 10_000 ether);

        vm.prank(alice);
        vault.deposit(assetsIn, alice);

        uint256 previewBurn = vault.previewWithdraw(assetsIn);
        vm.prank(alice);
        uint256 burned = vault.withdraw(assetsIn, alice, alice);
        assertEq(burned, previewBurn);

        uint256 remaining = vault.balanceOf(alice);
        uint256 previewOut = vault.previewRedeem(remaining);
        vm.prank(alice);
        uint256 out = vault.redeem(remaining, alice, alice);
        assertEq(out, previewOut);
    }

    function testFuzzDonationNeverReducesExistingShares(uint256 donation, uint256 deposit) public {
        deposit = bound(deposit, 1 ether, 10_000 ether);
        donation = bound(donation, 0, 1_000_000 ether);

        vm.prank(alice);
        uint256 shares = vault.deposit(deposit, alice);
        uint256 valueBefore = vault.previewRedeem(shares);

        asset.mint(address(vault), donation);

        uint256 valueAfter = vault.previewRedeem(shares);
        assertGe(valueAfter, valueBefore, "donation must not reduce existing share value");
        assertGe(vault.totalAssets(), deposit + donation);
    }

    function testFuzzDepositAfterDonationStillMintsShares(uint256 donation, uint256 deposit) public {
        donation = bound(donation, 0, 1_000_000 ether);
        deposit = bound(deposit, 1 ether, 10_000 ether);

        vm.prank(alice);
        vault.deposit(1 ether, alice); // seed
        asset.mint(address(vault), donation);

        vm.prank(alice);
        uint256 newShares = vault.deposit(deposit, alice);
        assertGt(newShares, 0, "six-decimal offset must resist donation zeroing a deposit");
    }

    function testFuzzConvertRoundTripFavorsVault(uint256 assets) public {
        assets = bound(assets, 1, 1e27);
        vm.prank(alice);
        vault.deposit(1 ether, alice);

        // Both conversions round down, so assets -> shares -> assets never exceeds input.
        uint256 shares = vault.convertToShares(assets);
        uint256 back = vault.convertToAssets(shares);
        assertLe(back, assets);
    }
}
