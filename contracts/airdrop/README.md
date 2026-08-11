# Merkle Airdrop

Phase 1 Core MVP lab for Merkle Proof verification, bitmap claim tracking, EIP-712 delegated claims, nonces, and expiry recovery.

## Contract

`MerkleAirdrop` uses OpenZeppelin `MerkleProof`, `EIP712`, `ECDSA`, `Ownable`, and `SafeERC20`. Leaves use the double-hash format:

```text
keccak256(bytes.concat(keccak256(abi.encode(index, account, amount))))
```

Delegated signatures bind the index, account, recipient, relayer, amount, current nonce, and signature deadline. The relayer is always `msg.sender` and is not an arbitrary user input.

## Local verification

```bash
pnpm contracts:fmt
pnpm contracts:build
pnpm contracts:test
```

## Deployment inputs

`script/DeployAirdrop.s.sol` reads these environment variables at runtime:

```text
DEPLOYER_PRIVATE_KEY
AIRDROP_MERKLE_ROOT
AIRDROP_DEADLINE
AIRDROP_FUNDING_AMOUNT
```

Do not put these values in the repository or documentation. The deployment script prints contract addresses after a successful broadcast; the Registry is updated only after the deployment receipt is verified.
