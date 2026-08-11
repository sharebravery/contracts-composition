// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MerkleAirdrop is EIP712, Ownable {
    using SafeERC20 for IERC20;

    bytes32 private constant CLAIM_TYPEHASH = keccak256(
        "Claim(uint256 index,address account,address recipient,address relayer,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    IERC20 public immutable token;
    bytes32 public immutable merkleRoot;
    uint256 public immutable deadline;

    mapping(uint256 word => uint256 bits) private claimedBitmap;
    mapping(address account => uint256 nonce) public nonces;

    error AlreadyClaimed(uint256 index);
    error ClaimExpired();
    error InvalidProof();
    error InvalidSignature();
    error SignatureExpired();
    error NotExpired();

    event Claimed(uint256 indexed index, address indexed account, address indexed recipient, uint256 amount);
    event ExpiredTokensRecovered(address indexed recipient, uint256 amount);

    constructor(IERC20 token_, bytes32 merkleRoot_, uint256 deadline_)
        EIP712("Merkle Airdrop", "1")
        Ownable(msg.sender)
    {
        token = token_;
        merkleRoot = merkleRoot_;
        deadline = deadline_;
    }

    function claim(uint256 index, uint256 amount, bytes32[] calldata proof) external {
        _requireClaimOpen();
        _claim(index, msg.sender, msg.sender, amount, proof);
    }

    function claimWithSignature(
        uint256 index,
        address account,
        address recipient,
        uint256 amount,
        uint256 signatureDeadline,
        bytes calldata signature,
        bytes32[] calldata proof
    ) external {
        _requireClaimOpen();
        if (block.timestamp > signatureDeadline) revert SignatureExpired();

        uint256 nonce = nonces[account];
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(CLAIM_TYPEHASH, index, account, recipient, msg.sender, amount, nonce, signatureDeadline)
            )
        );

        if (ECDSA.recover(digest, signature) != account) {
            revert InvalidSignature();
        }

        nonces[account] = nonce + 1;
        _claim(index, account, recipient, amount, proof);
    }

    function isClaimed(uint256 index) public view returns (bool) {
        uint256 word = index >> 8;
        uint256 mask = uint256(1) << (index & 0xff);
        return claimedBitmap[word] & mask != 0;
    }

    function recoverExpiredTokens(address recipient) external onlyOwner {
        if (block.timestamp <= deadline) revert NotExpired();

        uint256 amount = token.balanceOf(address(this));
        token.safeTransfer(recipient, amount);
        emit ExpiredTokensRecovered(recipient, amount);
    }

    function _claim(uint256 index, address account, address recipient, uint256 amount, bytes32[] calldata proof)
        internal
    {
        _setClaimed(index);

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) {
            revert InvalidProof();
        }

        token.safeTransfer(recipient, amount);
        emit Claimed(index, account, recipient, amount);
    }

    function _setClaimed(uint256 index) internal {
        uint256 word = index >> 8;
        uint256 mask = uint256(1) << (index & 0xff);
        if (claimedBitmap[word] & mask != 0) revert AlreadyClaimed(index);
        claimedBitmap[word] |= mask;
    }

    function _requireClaimOpen() internal view {
        if (block.timestamp > deadline) revert ClaimExpired();
    }
}
