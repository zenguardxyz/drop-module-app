// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IAccount} from "account-abstraction-v0.6/interfaces/IAccount.sol";


interface ICoinbaseSmartWallet is IAccount {

    function implementation() external view returns (address);

}
