// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {BasicVault} from "../src/BasicVault.sol";
import {MockAsset} from "../src/MockAsset.sol";

/// @notice Handler that drives random deposit/mint/withdraw/redeem/donate calls against the
/// vault so invariant functions can assert global ERC-4626 properties hold throughout.
contract VaultHandler is Test {
    uint256 internal constant SHARE_UNIT = 1e18;

    BasicVault public vault;
    MockAsset public asset;
    address[2] public actors;

    constructor(MockAsset asset_, BasicVault vault_) {
        asset = asset_;
        vault = vault_;
        actors[0] = address(0xA11CE);
        actors[1] = address(0xB0B);

        for (uint256 i = 0; i < 2; i++) {
            asset.mint(actors[i], 1_000_000 ether);
            vm.prank(actors[i]);
            asset.approve(address(vault), type(uint256).max);
        }

        // Seed shares to the handler itself so actors can never drain totalSupply to zero.
        asset.mint(address(this), 1 ether);
        asset.approve(address(vault), 1 ether);
        vault.deposit(1 ether, address(this));
    }

    function _actor(uint256 idx) internal view returns (address) {
        return actors[idx % 2];
    }

    function _assertPriceNonDecreasing(uint256 priceBefore) internal {
        uint256 priceAfter = vault.convertToAssets(SHARE_UNIT);
        assertGe(priceAfter, priceBefore, "share price must be non-decreasing");
    }

    function deposit(uint256 actorIdx, uint256 assets) external {
        address a = _actor(actorIdx);
        assets = bound(assets, 0, asset.balanceOf(a));
        if (assets == 0) return;

        uint256 priceBefore = vault.convertToAssets(SHARE_UNIT);
        vm.prank(a);
        vault.deposit(assets, a);
        _assertPriceNonDecreasing(priceBefore);
    }

    function mint(uint256 actorIdx, uint256 shares) external {
        address a = _actor(actorIdx);
        shares = bound(shares, 0, 1_000_000 ether);
        uint256 maxAssets = vault.previewMint(shares);
        if (maxAssets > asset.balanceOf(a)) return;

        uint256 priceBefore = vault.convertToAssets(SHARE_UNIT);
        vm.prank(a);
        vault.mint(shares, a);
        _assertPriceNonDecreasing(priceBefore);
    }

    function withdraw(uint256 actorIdx, uint256 assets) external {
        address a = _actor(actorIdx);
        uint256 maxAssets = vault.previewRedeem(vault.balanceOf(a));
        assets = bound(assets, 0, maxAssets);
        if (assets == 0) return;

        uint256 priceBefore = vault.convertToAssets(SHARE_UNIT);
        vm.prank(a);
        vault.withdraw(assets, a, a);
        _assertPriceNonDecreasing(priceBefore);
    }

    function redeem(uint256 actorIdx, uint256 shares) external {
        address a = _actor(actorIdx);
        shares = bound(shares, 0, vault.balanceOf(a));
        if (shares == 0) return;

        uint256 priceBefore = vault.convertToAssets(SHARE_UNIT);
        vm.prank(a);
        vault.redeem(shares, a, a);
        _assertPriceNonDecreasing(priceBefore);
    }

    function donate(uint256 assets) external {
        assets = bound(assets, 0, 1_000_000 ether);
        if (assets == 0) return;

        uint256 priceBefore = vault.convertToAssets(SHARE_UNIT);
        asset.mint(address(vault), assets);
        _assertPriceNonDecreasing(priceBefore);
    }
}

contract BasicVaultInvariantTest is Test {
    uint256 internal constant ROUND_TRIP_ASSETS = 1 ether;
    uint256 internal constant ROUND_TRIP_SHARES = 1_000_000 ether;

    MockAsset internal asset;
    BasicVault internal vault;
    VaultHandler internal handler;

    function setUp() public {
        asset = new MockAsset();
        vault = new BasicVault(asset, "Lab Vault Share", "lvSHARE");
        handler = new VaultHandler(asset, vault);

        bytes4[] memory selectors = new bytes4[](5);
        selectors[0] = VaultHandler.deposit.selector;
        selectors[1] = VaultHandler.mint.selector;
        selectors[2] = VaultHandler.withdraw.selector;
        selectors[3] = VaultHandler.redeem.selector;
        selectors[4] = VaultHandler.donate.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    /// @dev Vault never owes more assets than it holds.
    function invariantVaultIsSolvent() public view {
        assertLe(vault.convertToAssets(vault.totalSupply()), asset.balanceOf(address(vault)));
    }

    /// @dev Seed is never drained, so conversions are always well-defined.
    function invariantTotalSupplyNeverZero() public view {
        assertGt(vault.totalSupply(), 0);
    }

    /// @dev assets -> shares -> assets never exceeds the input (rounding favors the vault).
    function invariantRoundTripAssets() public view {
        uint256 shares = vault.convertToShares(ROUND_TRIP_ASSETS);
        assertLe(vault.convertToAssets(shares), ROUND_TRIP_ASSETS);
    }

    /// @dev shares -> assets -> shares never exceeds the input (rounding favors the vault).
    function invariantRoundTripShares() public view {
        uint256 assets = vault.convertToAssets(ROUND_TRIP_SHARES);
        assertLe(vault.convertToShares(assets), ROUND_TRIP_SHARES);
    }
}
