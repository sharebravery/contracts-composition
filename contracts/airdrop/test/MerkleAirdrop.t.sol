// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {MerkleAirdrop} from "../src/MerkleAirdrop.sol";
import {MockLabToken} from "../src/MockLabToken.sol";

contract MerkleAirdropTest is Test {
    uint256 internal constant CLAIM_AMOUNT = 100 ether;
    uint256 internal constant SIGNER_PRIVATE_KEY = 0xA11CE;

    address internal claimant;
    address internal relayer = address(0xBEEF);
    address internal recipient = address(0xCAFE);
    MockLabToken internal token;
    MerkleAirdrop internal airdrop;
    uint256 internal airdropDeadline;
    bytes32 internal root;

    function setUp() public {
        claimant = vm.addr(SIGNER_PRIVATE_KEY);
        airdropDeadline = block.timestamp + 7 days;
        root = _leaf(7, claimant, CLAIM_AMOUNT);

        token = new MockLabToken();
        airdrop = new MerkleAirdrop(token, root, airdropDeadline);
        token.mint(address(airdrop), CLAIM_AMOUNT * 2);
    }

    function testClaimTransfersTokensAndMarksBitmap() public {
        vm.prank(claimant);
        airdrop.claim(7, CLAIM_AMOUNT, new bytes32[](0));

        assertEq(token.balanceOf(claimant), CLAIM_AMOUNT);
        assertTrue(airdrop.isClaimed(7));
    }

    function testClaimRejectsInvalidProof() public {
        vm.expectRevert(MerkleAirdrop.InvalidProof.selector);
        vm.prank(claimant);
        airdrop.claim(7, CLAIM_AMOUNT + 1, new bytes32[](0));
    }

    function testClaimRejectsDuplicateIndex() public {
        vm.startPrank(claimant);
        airdrop.claim(7, CLAIM_AMOUNT, new bytes32[](0));
        vm.expectRevert(abi.encodeWithSelector(MerkleAirdrop.AlreadyClaimed.selector, 7));
        airdrop.claim(7, CLAIM_AMOUNT, new bytes32[](0));
        vm.stopPrank();
    }

    function testClaimRejectsAfterDeadline() public {
        vm.warp(airdropDeadline + 1);

        vm.expectRevert(MerkleAirdrop.ClaimExpired.selector);
        vm.prank(claimant);
        airdrop.claim(7, CLAIM_AMOUNT, new bytes32[](0));
    }

    function testClaimAcceptsAValidTwoLeafProof() public {
        address secondClaimant = address(0xD00D);
        uint256 secondAmount = 50 ether;
        bytes32 firstLeaf = _leaf(7, claimant, CLAIM_AMOUNT);
        bytes32 secondLeaf = _leaf(8, secondClaimant, secondAmount);
        bytes32 pair = firstLeaf < secondLeaf
            ? keccak256(bytes.concat(firstLeaf, secondLeaf))
            : keccak256(bytes.concat(secondLeaf, firstLeaf));
        MerkleAirdrop twoLeafAirdrop = new MerkleAirdrop(token, pair, airdropDeadline);
        token.mint(address(twoLeafAirdrop), CLAIM_AMOUNT);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = secondLeaf;

        vm.prank(claimant);
        twoLeafAirdrop.claim(7, CLAIM_AMOUNT, proof);

        assertEq(token.balanceOf(claimant), CLAIM_AMOUNT);
    }

    function testOnlyOwnerCanRecoverExpiredTokens() public {
        vm.warp(airdropDeadline + 1);

        vm.expectRevert();
        vm.prank(address(0x1234));
        airdrop.recoverExpiredTokens(address(0x1234));
    }

    function testRecoverRejectsBeforeDeadlineAndTransfersAfterDeadline() public {
        vm.expectRevert(MerkleAirdrop.NotExpired.selector);
        airdrop.recoverExpiredTokens(address(this));

        vm.warp(airdropDeadline + 1);
        uint256 balanceBefore = token.balanceOf(address(this));
        airdrop.recoverExpiredTokens(address(this));

        assertEq(token.balanceOf(address(this)), balanceBefore + CLAIM_AMOUNT * 2);
    }

    function testClaimWithSignatureBindsRelayerAndIncrementsNonce() public {
        uint256 signatureDeadline = block.timestamp + 1 days;
        bytes32 digest = _claimDigest(claimant, recipient, relayer, signatureDeadline, 0);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, digest);

        vm.prank(relayer);
        airdrop.claimWithSignature(
            7, claimant, recipient, CLAIM_AMOUNT, signatureDeadline, abi.encodePacked(r, s, v), new bytes32[](0)
        );

        assertEq(token.balanceOf(recipient), CLAIM_AMOUNT);
        assertEq(airdrop.nonces(claimant), 1);
    }

    function testClaimWithSignatureRejectsDifferentRelayer() public {
        uint256 signatureDeadline = block.timestamp + 1 days;
        bytes32 digest = _claimDigest(claimant, recipient, relayer, signatureDeadline, 0);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, digest);

        vm.expectRevert(MerkleAirdrop.InvalidSignature.selector);
        vm.prank(address(0x1234));
        airdrop.claimWithSignature(
            7, claimant, recipient, CLAIM_AMOUNT, signatureDeadline, abi.encodePacked(r, s, v), new bytes32[](0)
        );
    }

    function testClaimWithSignatureRejectsExpiredSignature() public {
        uint256 signatureDeadline = block.timestamp + 1 days;
        bytes32 digest = _claimDigest(claimant, recipient, relayer, signatureDeadline, 0);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, digest);

        vm.warp(signatureDeadline + 1);
        vm.expectRevert(MerkleAirdrop.SignatureExpired.selector);
        vm.prank(relayer);
        airdrop.claimWithSignature(
            7, claimant, recipient, CLAIM_AMOUNT, signatureDeadline, abi.encodePacked(r, s, v), new bytes32[](0)
        );
    }

    function testClaimWithSignatureRejectsReplay() public {
        uint256 signatureDeadline = block.timestamp + 1 days;
        bytes32 digest = _claimDigest(claimant, recipient, relayer, signatureDeadline, 0);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.startPrank(relayer);
        airdrop.claimWithSignature(7, claimant, recipient, CLAIM_AMOUNT, signatureDeadline, signature, new bytes32[](0));
        vm.expectRevert(MerkleAirdrop.InvalidSignature.selector);
        airdrop.claimWithSignature(7, claimant, recipient, CLAIM_AMOUNT, signatureDeadline, signature, new bytes32[](0));
        vm.stopPrank();
    }

    function _leaf(uint256 index, address account, uint256 amount) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))));
    }

    function _claimDigest(
        address account,
        address signedRecipient,
        address signedRelayer,
        uint256 signatureDeadline,
        uint256 nonce
    ) internal view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Merkle Airdrop")),
                keccak256(bytes("1")),
                block.chainid,
                address(airdrop)
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Claim(uint256 index,address account,address recipient,address relayer,uint256 amount,uint256 nonce,uint256 deadline)"
                ),
                7,
                account,
                signedRecipient,
                signedRelayer,
                CLAIM_AMOUNT,
                nonce,
                signatureDeadline
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }
}
