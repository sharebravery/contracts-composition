// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {MerkleAirdrop} from "../src/MerkleAirdrop.sol";
import {MockLabToken} from "../src/MockLabToken.sol";

/// @notice Fuzz and edge-case coverage for Merkle claims: random valid/invalid leaves,
/// bitmap boundaries, deadline boundaries, and signature binding/replay.
contract MerkleAirdropFuzzTest is Test {
    uint256 internal constant SIGNER_PRIVATE_KEY = 0xA11CE;
    uint256 internal constant CLAIM_AMOUNT = 100 ether;

    address internal claimant;
    address internal relayer = address(0xBEEF);
    address internal recipient = address(0xCAFE);
    MockLabToken internal token;
    uint256 internal airdropDeadline;

    function setUp() public {
        claimant = vm.addr(SIGNER_PRIVATE_KEY);
        airdropDeadline = block.timestamp + 7 days;
        token = new MockLabToken();
    }

    function _leaf(uint256 index, address account, uint256 amount) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))));
    }

    function _claimDigest(
        MerkleAirdrop ad,
        uint256 index,
        address account,
        address signedRecipient,
        address signedRelayer,
        uint256 amount,
        uint256 nonce,
        uint256 signatureDeadline
    ) internal view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Merkle Airdrop")),
                keccak256(bytes("1")),
                block.chainid,
                address(ad)
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Claim(uint256 index,address account,address recipient,address relayer,uint256 amount,uint256 nonce,uint256 deadline)"
                ),
                index,
                account,
                signedRecipient,
                signedRelayer,
                amount,
                nonce,
                signatureDeadline
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function _deploySingleLeafAirdrop(bytes32 root, uint256 funding) internal returns (MerkleAirdrop) {
        MerkleAirdrop ad = new MerkleAirdrop(token, root, airdropDeadline);
        token.mint(address(ad), funding);
        return ad;
    }

    function testFuzzClaimSucceedsForValidLeaf(uint256 index, address account, uint256 amount) public {
        vm.assume(account != address(0));
        amount = bound(amount, 1, type(uint96).max);
        bytes32 root = _leaf(index, account, amount);
        MerkleAirdrop ad = _deploySingleLeafAirdrop(root, amount);

        vm.prank(account);
        ad.claim(index, amount, new bytes32[](0));

        assertEq(token.balanceOf(account), amount);
        assertTrue(ad.isClaimed(index));
    }

    function testFuzzClaimRejectsWrongAmount(uint256 index, address account, uint256 amount, uint256 wrongAmount)
        public
    {
        amount = bound(amount, 1, type(uint96).max);
        wrongAmount = bound(wrongAmount, 1, type(uint96).max);
        vm.assume(wrongAmount != amount);

        bytes32 root = _leaf(index, account, amount);
        MerkleAirdrop ad = _deploySingleLeafAirdrop(root, amount + wrongAmount);

        vm.expectRevert(MerkleAirdrop.InvalidProof.selector);
        vm.prank(account);
        ad.claim(index, wrongAmount, new bytes32[](0));
    }

    function testFuzzClaimRejectsWrongAccount(uint256 index, address account, uint256 amount, address wrongAccount)
        public
    {
        amount = bound(amount, 1, type(uint96).max);
        vm.assume(wrongAccount != account);

        bytes32 root = _leaf(index, account, amount);
        MerkleAirdrop ad = _deploySingleLeafAirdrop(root, amount);

        vm.expectRevert(MerkleAirdrop.InvalidProof.selector);
        vm.prank(wrongAccount);
        ad.claim(index, amount, new bytes32[](0));
    }

    function testClaimBitmapBoundaries() public {
        uint256[4] memory indices = [uint256(0), 255, 256, 511];
        for (uint256 i = 0; i < indices.length; i++) {
            uint256 index = indices[i];
            address account = address(uint160(0xD00D + i));
            bytes32 root = _leaf(index, account, CLAIM_AMOUNT);
            MerkleAirdrop ad = _deploySingleLeafAirdrop(root, CLAIM_AMOUNT);

            vm.prank(account);
            ad.claim(index, CLAIM_AMOUNT, new bytes32[](0));
            assertTrue(ad.isClaimed(index));

            vm.expectRevert(abi.encodeWithSelector(MerkleAirdrop.AlreadyClaimed.selector, index));
            vm.prank(account);
            ad.claim(index, CLAIM_AMOUNT, new bytes32[](0));
        }
    }

    function testClaimDeadlineBoundary() public {
        bytes32 root = _leaf(7, claimant, CLAIM_AMOUNT);
        MerkleAirdrop ad = _deploySingleLeafAirdrop(root, CLAIM_AMOUNT);

        // At exactly the deadline the claim is still open.
        vm.warp(airdropDeadline);
        vm.prank(claimant);
        ad.claim(7, CLAIM_AMOUNT, new bytes32[](0));

        // One second past the deadline a second leaf cannot be claimed.
        bytes32 root2 = _leaf(8, claimant, CLAIM_AMOUNT);
        MerkleAirdrop ad2 = _deploySingleLeafAirdrop(root2, CLAIM_AMOUNT);
        vm.warp(airdropDeadline + 1);
        vm.expectRevert(MerkleAirdrop.ClaimExpired.selector);
        vm.prank(claimant);
        ad2.claim(8, CLAIM_AMOUNT, new bytes32[](0));
    }

    function testSignatureDeadlineBoundary() public {
        bytes32 root = _leaf(7, claimant, CLAIM_AMOUNT);
        MerkleAirdrop ad = _deploySingleLeafAirdrop(root, CLAIM_AMOUNT);

        uint256 sigDeadline = block.timestamp + 1 days;
        bytes32 digest = _claimDigest(ad, 7, claimant, recipient, relayer, CLAIM_AMOUNT, 0, sigDeadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // At exactly the signature deadline it is still valid.
        vm.warp(sigDeadline);
        vm.prank(relayer);
        ad.claimWithSignature(7, claimant, recipient, CLAIM_AMOUNT, sigDeadline, signature, new bytes32[](0));
        assertEq(token.balanceOf(recipient), CLAIM_AMOUNT);

        // One second past: rejected.
        MerkleAirdrop ad2 = _deploySingleLeafAirdrop(root, CLAIM_AMOUNT);
        vm.warp(sigDeadline + 1);
        vm.expectRevert(MerkleAirdrop.SignatureExpired.selector);
        vm.prank(relayer);
        ad2.claimWithSignature(7, claimant, recipient, CLAIM_AMOUNT, sigDeadline, signature, new bytes32[](0));
    }

    function testSignatureBindsIndexAmountAndRecipient() public {
        bytes32 root = _leaf(7, claimant, CLAIM_AMOUNT);
        MerkleAirdrop ad = _deploySingleLeafAirdrop(root, CLAIM_AMOUNT);

        uint256 sigDeadline = block.timestamp + 1 days;
        bytes32 digest = _claimDigest(ad, 7, claimant, recipient, relayer, CLAIM_AMOUNT, 0, sigDeadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Signature verification runs before the proof check, so tampering with any signed
        // field (index, amount, recipient) is rejected as an invalid signature.
        vm.expectRevert(MerkleAirdrop.InvalidSignature.selector);
        vm.prank(relayer);
        ad.claimWithSignature(8, claimant, recipient, CLAIM_AMOUNT, sigDeadline, signature, new bytes32[](0));

        vm.expectRevert(MerkleAirdrop.InvalidSignature.selector);
        vm.prank(relayer);
        ad.claimWithSignature(7, claimant, recipient, CLAIM_AMOUNT + 1, sigDeadline, signature, new bytes32[](0));

        vm.expectRevert(MerkleAirdrop.InvalidSignature.selector);
        vm.prank(relayer);
        ad.claimWithSignature(7, claimant, address(0xDEAD), CLAIM_AMOUNT, sigDeadline, signature, new bytes32[](0));

        // A valid signature with a wrong proof still reaches the Merkle check.
        bytes32[] memory badProof = new bytes32[](1);
        badProof[0] = bytes32(type(uint256).max);
        vm.expectRevert(MerkleAirdrop.InvalidProof.selector);
        vm.prank(relayer);
        ad.claimWithSignature(7, claimant, recipient, CLAIM_AMOUNT, sigDeadline, signature, badProof);
    }

    function testSignatureNonceBlocksReplayAcrossClaims() public {
        bytes32 root = _leaf(7, claimant, CLAIM_AMOUNT);
        // Fund two allocations so a replay attempt could otherwise succeed.
        MerkleAirdrop ad = new MerkleAirdrop(token, root, airdropDeadline);
        token.mint(address(ad), CLAIM_AMOUNT * 2);

        uint256 sigDeadline = block.timestamp + 1 days;
        bytes32 digest = _claimDigest(ad, 7, claimant, recipient, relayer, CLAIM_AMOUNT, 0, sigDeadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.prank(relayer);
        ad.claimWithSignature(7, claimant, recipient, CLAIM_AMOUNT, sigDeadline, signature, new bytes32[](0));
        assertEq(ad.nonces(claimant), 1);

        // Same signature (nonce 0) cannot be replayed even though the bitmap is for a fresh
        // index would not apply here - the index is already claimed AND the nonce advanced.
        vm.expectRevert(MerkleAirdrop.InvalidSignature.selector);
        vm.prank(relayer);
        ad.claimWithSignature(7, claimant, recipient, CLAIM_AMOUNT, sigDeadline, signature, new bytes32[](0));
    }
}
