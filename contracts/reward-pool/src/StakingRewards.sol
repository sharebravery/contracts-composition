// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract StakingRewards is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardsToken;
    uint256 public immutable duration;

    uint256 public periodFinish;
    uint256 public rewardRate;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;

    mapping(address account => uint256) public userRewardPerTokenPaid;
    mapping(address account => uint256) public rewards;
    mapping(address account => uint256) public balanceOf;
    uint256 public totalSupply;

    error InsufficientRewardBalance();
    error InsufficientStake();
    error RewardRateZero();
    error ZeroAmount();

    event Staked(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event RewardAdded(uint256 reward, uint256 rewardRate, uint256 periodFinish);
    event RewardPaid(address indexed account, uint256 reward);

    constructor(IERC20 stakingToken_, IERC20 rewardsToken_, uint256 duration_) Ownable(msg.sender) {
        if (address(stakingToken_) == address(0)) revert ZeroAmount();
        if (address(rewardsToken_) == address(0)) revert ZeroAmount();
        if (duration_ == 0) revert ZeroAmount();

        stakingToken = stakingToken_;
        rewardsToken = rewardsToken_;
        duration = duration_;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    function stake(uint256 amount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        if (amount == 0) revert ZeroAmount();

        totalSupply += amount;
        balanceOf[msg.sender] += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant updateReward(msg.sender) {
        _withdraw(msg.sender, amount);
    }

    function claim() external nonReentrant updateReward(msg.sender) {
        _claim(msg.sender);
    }

    function getReward() external nonReentrant updateReward(msg.sender) {
        _claim(msg.sender);
    }

    function exit() external nonReentrant updateReward(msg.sender) {
        uint256 amount = balanceOf[msg.sender];
        _withdraw(msg.sender, amount);
        _claim(msg.sender);
    }

    function notifyRewardAmount(uint256 reward) external onlyOwner updateReward(address(0)) {
        if (reward == 0) revert ZeroAmount();

        uint256 nextRewardRate;
        if (block.timestamp >= periodFinish) {
            nextRewardRate = reward / duration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            nextRewardRate = (reward + leftover) / duration;
        }

        if (nextRewardRate == 0) revert RewardRateZero();
        if (nextRewardRate > rewardsToken.balanceOf(address(this)) / duration) {
            revert InsufficientRewardBalance();
        }

        rewardRate = nextRewardRate;
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + duration;
        emit RewardAdded(reward, nextRewardRate, periodFinish);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) return rewardPerTokenStored;

        return rewardPerTokenStored + ((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18) / totalSupply;
    }

    function earned(address account) public view returns (uint256) {
        return (balanceOf[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 + rewards[account];
    }

    function _withdraw(address account, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();
        if (amount > balanceOf[account]) revert InsufficientStake();

        totalSupply -= amount;
        balanceOf[account] -= amount;
        stakingToken.safeTransfer(account, amount);
        emit Withdrawn(account, amount);
    }

    function _claim(address account) internal {
        uint256 reward = rewards[account];
        if (reward == 0) return;

        rewards[account] = 0;
        rewardsToken.safeTransfer(account, reward);
        emit RewardPaid(account, reward);
    }
}
