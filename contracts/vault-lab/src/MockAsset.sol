// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockAsset is ERC20 {
    constructor() ERC20("Mock Vault Asset", "MVA") {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}
