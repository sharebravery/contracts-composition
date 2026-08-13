// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {TreasuryV1} from "./TreasuryV1.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TreasuryV2 is TreasuryV1 {
    using SafeERC20 for IERC20;

    /// @notice Per-asset rolling daily limit for an ERC-20 token. ETH accounting reuses
    /// V1's `dailyLimit` / `spentToday` / `dayStart` slots so the upgrade needs no migration.
    struct AssetLimit {
        uint256 limit;
        uint256 spent;
        uint256 windowStart;
    }

    mapping(address recipient => bool allowed) private _allowlisted;
    mapping(address token => AssetLimit) private _erc20Limits;

    error ArrayLengthMismatch();
    error RecipientNotAllowlisted(address recipient);

    event AllowlistUpdated(address indexed recipient, bool allowed);
    event ERC20DailyLimitUpdated(address indexed token, uint256 newLimit);

    function version() public pure override returns (uint256) {
        return 2;
    }

    function setAllowlisted(address recipient, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert InvalidRecipient();
        _allowlisted[recipient] = allowed;
        emit AllowlistUpdated(recipient, allowed);
    }

    function isAllowlisted(address recipient) public view returns (bool) {
        return _allowlisted[recipient];
    }

    /// @notice Sets the rolling daily limit for an ERC-20 token. A token starts with a
    /// limit of zero, so ERC-20 payments are blocked until an admin explicitly opts the
    /// token in. ETH uses `setDailyLimit` (V1).
    function setERC20DailyLimit(IERC20 token, uint256 newLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (address(token) == address(0)) revert InvalidRecipient();
        if (newLimit == 0) revert InvalidAmount();
        _erc20Limits[address(token)].limit = newLimit;
        emit ERC20DailyLimitUpdated(address(token), newLimit);
    }

    function erc20DailyLimit(IERC20 token) public view returns (uint256) {
        return _erc20Limits[address(token)].limit;
    }

    function erc20SpentToday(IERC20 token) public view returns (uint256) {
        return _erc20Limits[address(token)].spent;
    }

    function remainingERC20DailyLimit(IERC20 token) public view returns (uint256) {
        AssetLimit storage lim = _erc20Limits[address(token)];
        if (block.timestamp >= lim.windowStart + PAYMENT_WINDOW) return lim.limit;
        return _remaining(lim.limit, lim.spent);
    }

    function payERC20(IERC20 token, address recipient, uint256 amount)
        external
        virtual
        override
        onlyRole(TREASURER_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (address(token) == address(0) || recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();

        _checkRecipient(recipient);
        _consumeErc20Limit(token, amount);
        token.safeTransfer(recipient, amount);

        emit PaymentSent(address(token), recipient, amount);
    }

    function batchPayETH(address[] calldata recipients, uint256[] calldata amounts)
        external
        onlyRole(TREASURER_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (recipients.length != amounts.length) revert ArrayLengthMismatch();

        uint256 totalAmount;
        for (uint256 i; i < recipients.length; ++i) {
            if (recipients[i] == address(0) || amounts[i] == 0) revert InvalidAmount();
            _checkRecipient(recipients[i]);
            totalAmount += amounts[i];
        }
        _consumeDailyLimit(totalAmount);

        for (uint256 i; i < recipients.length; ++i) {
            // slither-disable-next-line arbitrary-send-eth: recipients are allowlist-gated by _checkRecipient above
            (bool success,) = recipients[i].call{value: amounts[i]}("");
            if (!success) revert ETHTransferFailed();
            emit PaymentSent(address(0), recipients[i], amounts[i]);
        }
    }

    function _consumeErc20Limit(IERC20 token, uint256 amount) internal {
        AssetLimit storage lim = _erc20Limits[address(token)];
        if (block.timestamp >= lim.windowStart + PAYMENT_WINDOW) {
            lim.windowStart = block.timestamp;
            lim.spent = 0;
        }

        uint256 remaining = _remaining(lim.limit, lim.spent);
        if (amount > remaining) revert DailyLimitExceeded(amount, remaining);
        lim.spent += amount;
    }

    function _checkRecipient(address recipient) internal view override {
        if (!_allowlisted[recipient]) revert RecipientNotAllowlisted(recipient);
    }
}
