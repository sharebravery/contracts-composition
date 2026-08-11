// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {TreasuryV1} from "./TreasuryV1.sol";

contract TreasuryV2 is TreasuryV1 {
    mapping(address recipient => bool allowed) private _allowlisted;

    error ArrayLengthMismatch();
    error RecipientNotAllowlisted(address recipient);

    event AllowlistUpdated(address indexed recipient, bool allowed);

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
            (bool success,) = recipients[i].call{value: amounts[i]}("");
            if (!success) revert ETHTransferFailed();
            emit PaymentSent(address(0), recipients[i], amounts[i]);
        }
    }

    function _checkRecipient(address recipient) internal view override {
        if (!_allowlisted[recipient]) revert RecipientNotAllowlisted(recipient);
    }
}
