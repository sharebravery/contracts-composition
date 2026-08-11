// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TreasuryV1 is Initializable, AccessControlUpgradeable, PausableUpgradeable, ReentrancyGuard, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 public constant UPGRADE_ADMIN_ROLE = keccak256("UPGRADE_ADMIN_ROLE");
    uint256 public constant PAYMENT_WINDOW = 1 days;

    uint256 public dailyLimit;
    uint256 public spentToday;
    uint256 public dayStart;

    error InvalidConfiguration();
    error InvalidAmount();
    error InvalidRecipient();
    error DailyLimitExceeded(uint256 requested, uint256 remaining);
    error ETHTransferFailed();

    event FundsDeposited(address indexed sender, address indexed token, uint256 amount);
    event PaymentSent(address indexed token, address indexed recipient, uint256 amount);
    event DailyLimitUpdated(uint256 previousLimit, uint256 newLimit);

    constructor() {
        _disableInitializers();
    }

    function initialize(address admin, address treasurer, address upgradeAdmin, uint256 dailyLimit_)
        public
        initializer
    {
        if (admin == address(0) || treasurer == address(0) || upgradeAdmin == address(0) || dailyLimit_ == 0) {
            revert InvalidConfiguration();
        }

        __AccessControl_init();
        __Pausable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREASURER_ROLE, treasurer);
        _grantRole(UPGRADE_ADMIN_ROLE, upgradeAdmin);

        dailyLimit = dailyLimit_;
        dayStart = block.timestamp;
    }

    receive() external payable {
        if (paused()) revert EnforcedPause();
        emit FundsDeposited(msg.sender, address(0), msg.value);
    }

    function depositETH() external payable whenNotPaused {
        emit FundsDeposited(msg.sender, address(0), msg.value);
    }

    function depositERC20(IERC20 token, uint256 amount) external whenNotPaused {
        if (address(token) == address(0) || amount == 0) revert InvalidAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit FundsDeposited(msg.sender, address(token), amount);
    }

    function payETH(address payable recipient, uint256 amount)
        external
        virtual
        onlyRole(TREASURER_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();

        _checkRecipient(recipient);
        _consumeDailyLimit(amount);
        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert ETHTransferFailed();

        emit PaymentSent(address(0), recipient, amount);
    }

    function payERC20(IERC20 token, address recipient, uint256 amount)
        external
        virtual
        onlyRole(TREASURER_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (address(token) == address(0) || recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();

        _checkRecipient(recipient);
        _consumeDailyLimit(amount);
        token.safeTransfer(recipient, amount);

        emit PaymentSent(address(token), recipient, amount);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function setDailyLimit(uint256 newLimit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newLimit == 0) revert InvalidAmount();
        uint256 previousLimit = dailyLimit;
        dailyLimit = newLimit;
        emit DailyLimitUpdated(previousLimit, newLimit);
    }

    function remainingDailyLimit() public view returns (uint256) {
        if (block.timestamp >= dayStart + PAYMENT_WINDOW) return dailyLimit;
        return dailyLimit - spentToday;
    }

    function version() public pure virtual returns (uint256) {
        return 1;
    }

    function _consumeDailyLimit(uint256 amount) internal {
        if (block.timestamp >= dayStart + PAYMENT_WINDOW) {
            dayStart = block.timestamp;
            spentToday = 0;
        }

        uint256 remaining = dailyLimit - spentToday;
        if (amount > remaining) revert DailyLimitExceeded(amount, remaining);
        spentToday += amount;
    }

    function _checkRecipient(address) internal view virtual {}

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADE_ADMIN_ROLE) {}
}
