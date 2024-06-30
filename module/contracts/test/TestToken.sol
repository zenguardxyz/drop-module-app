// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract OnchainSummerToken is ERC20, ERC20Permit {
    constructor(address initialMintDest) ERC20("Onchain Summer Token", "OST") ERC20Permit("Onchain Summer Token") {
        _mint(initialMintDest, 1000000 * 10 ** decimals());
    }
}
