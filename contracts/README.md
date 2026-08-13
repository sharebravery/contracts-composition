# Contracts

Foundry 合约包按 Lab 拆分，当前包含：

- `airdrop`：Merkle proof、bitmap、签名代领和过期回收。
- `reward-pool`：按时间和份额累计奖励的 Staking Reward Pool。
- `vault-lab`：带虚拟份额偏移和暂停边界的 ERC-4626 Basic Vault。
- `treasury-lab`：带角色、per-asset 每日额度、allowlist、批量付款和 V1/V2 存储追加的 UUPS Treasury。

每个 Lab 都有独立的 Foundry 配置、测试和部署脚本。部署脚本只从运行时环境变量读取密钥，不把密钥写入仓库。
