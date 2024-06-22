// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { HandlerContext } from "@safe-global/safe-contracts/contracts/handler/HandlerContext.sol";
import { AccountBase } from "erc7579/core/AccountBase.sol";

/**
 * Implements AccessControl for Safe7579 adapter.
 * Since Safe7579 Adapter is installed as a fallback handler on the safe account, we are making use
 * of handlercontext (ERC2771)
 * @author zeroknots.eth | rhinestone.wtf
 */
abstract contract AccessControl is HandlerContext, AccountBase {
    modifier onlyEntryPointOrSelf() virtual override {
        if (!(_msgSender() == entryPoint() || msg.sender == _msgSender())) {
            revert AccountAccessUnauthorized();
        }
        _;
    }

    modifier onlyEntryPoint() virtual override {
        if (_msgSender() != entryPoint()) {
            revert AccountAccessUnauthorized();
        }
        _;
    }

    function entryPoint() public view virtual override returns (address) {
        return 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
    }
}
