// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

import { ERC7579ValidatorBase } from "../module-bases/ERC7579ValidatorBase.sol";
import { PackedUserOperation } from
    "@account-abstraction/contracts/core/UserOperationLib.sol";

import { SignatureCheckerLib } from "solady/utils/SignatureCheckerLib.sol";
import { ECDSA } from "solady/utils/ECDSA.sol";
import { ExecutionLib } from "../safe7579/lib/ExecutionLib.sol";

import { ERC7579ExecutorBase } from "../module-bases/ERC7579ExecutorBase.sol";

import { ICoinbaseSmartWallet } from "../smart-wallet/interface/ICoinbaseSmartWallet.sol";
import { ISafe } from "../smart-wallet/interface/ISafe.sol";

contract SafeFaucetModule is ERC7579ValidatorBase, ERC7579ExecutorBase {
    using SignatureCheckerLib for address;
    using ExecutionLib for bytes;


    FaucetData[] public faucets;

    mapping(address => mapping(uint256 => FaucetUserData)) public faucetUsers;

    mapping(address => uint256) public faucetCounter;

    enum AccountType { Safe, CoinbaseSW, eoa }

    struct FaucetData {

        address token;
        address account;
        uint48 validAfter;
        uint48 validUntil;

        uint256 limitAmount;
        uint48 refreshInterval;

        AccountSupport safe;
        AccountSupport cbSW;
        AccountSupport eoa;
    }

    struct AccountSupport {
        address[] singletons;
        string[] versions;
        bool supported;

    }

    struct FaucetUserData {
       uint256 faucetId;
       uint256 limitUsed;
       uint48 lastUsed;    
       bool exists;
    }
            
    event SessionKeyAdded(address indexed sessionKey, address indexed account);

    error ExecutionFailed();

    error InvalidRecipient();

    function onInstall(bytes calldata data) external override {
    }

    function onUninstall(bytes calldata) external override {

        // delete the Safe account sessions
    }

    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash
    )
        external
        view
        override
        returns (ValidationData)
    {

        return _packValidationData(false, type(uint48).max, 0);
    }

    function isValidSignatureWithSender(
        address,
        bytes32 hash,
        bytes calldata data
    )
        external
        view
        override
        returns (bytes4)
    {

        //Implement the session key sig validation

        // return SignatureCheckerLib.isValidSignatureNowCalldata(owner, hash, data)
        //     ? EIP1271_SUCCESS
        //     : EIP1271_FAILED;
    }


    /**
     * @dev Adds a session key to the mapping.
     */
    // Add a session key to the mapping
    function addFaucet(FaucetData memory faucetData) public returns (uint256) {

        faucetData.account = msg.sender; 
        faucets.push(faucetData);
        // emit SessionKeyAdded(sessionKey, msg.sender);

        return faucets.length - 1;
    }


    /**
     * @dev Executes a transaction on behalf of a session.
     * @param to The address to which the transaction is being sent.
     * @param value The amount of ether to send with the transaction.
     * @param data The data to include with the transaction.
     * @return The result of the transaction execution.
     */
    function execute(uint256 faucetId, address to, uint256 value, bytes calldata data) public returns (bytes memory) {

        address token = value == 0 ? to : address(0);

        (address callDataTo, uint256 callDataAmount) = _getTokenSpendAmount(data);

        address toAddress = value == 0 ? callDataTo : to;

        uint256 tokenValue = value == 0 ? callDataAmount : value;


        if( !faucetUsers[toAddress][faucetId].exists)
        faucetCounter[toAddress]++;

        require(faucetCounter[toAddress] <= 1);

        if(!checkAccountAcceptance(faucetId, toAddress)) {
            revert("Invalid target address");
        }


        if(!updateSpendLimitUsage(tokenValue, faucetId, token, toAddress))  {
            revert ExecutionFailed();
        }
   
        return _execute(msg.sender, to, value, data);


        }


        function checkAccountAcceptance(uint256 faucetId, address to) internal returns (bool) {

          bool accepted = false;  

        if(faucets[faucetId].eoa.supported) 
        return true;

   
        try ICoinbaseSmartWallet(to).implementation() returns (address impl) {
            // Address is indeed a contract and supports the interface

            require(faucets[faucetId].cbSW.supported, "CoinbaseSmartWallet not supported");
 
            for(uint i=0; i<faucets[faucetId].cbSW.singletons.length; i++) {

            if(impl == faucets[faucetId].cbSW.singletons[i])
                accepted = true;
            }

            if(!accepted)
            revert("Not a valid CoinbaseSmartWallet");

        } catch {

            try ISafe(to).VERSION() returns (string memory version) 
            {

            require(faucets[faucetId].safe.supported, "Safe not supported");
 
            for(uint i=0; i<faucets[faucetId].safe.versions.length; i++) {

            if(keccak256(abi.encodePacked(version)) == keccak256(abi.encodePacked(faucets[faucetId].safe.versions[i])))
                accepted = true;
            }
            if(!accepted)
            revert("Not a valid Safe Account version");

        } catch {
            
            // Address is not an instance of Safe or CoinbaseSmartWallet
            revert("Not a valid Safe Account or CoinbaseSmartWallet");
        }
        }

        return accepted;

        }

        function _getTokenSpendAmount(bytes memory callData) internal pure returns (address, uint256) {

        // Expected length: 68 bytes (4 selector + 32 address + 32 amount)
        if (callData.length < 68) {
            return (address(0), 0);
        }

        // Load the amount being sent/approved.
        // Solidity doesn't support access a whole word from a bytes memory at once, only a single byte, and
        // trying to use abi.decode would require copying the data to remove the selector, which is expensive.
        // Instead, we use inline assembly to load the amount directly. This is safe because we've checked the
        // length of the call data.
        uint256 amount;
        address to;
        assembly ("memory-safe") {
            // Jump 68 words forward: 32 for the length field, 4 for the selector, and 32 for the to address.
            to := mload(add(callData, 36))
            amount := mload(add(callData, 68))
        }
        return (to, amount);
        
        // Unrecognized function selector
        return (address(0), 0);
    }

    function updateSpendLimitUsage(
        uint256 newUsage,
        uint256 faucetId,
        address token,
        address to
    ) internal returns (bool) {


        FaucetData storage faucetData = faucets[faucetId];
        FaucetUserData storage faucetUser = faucetUsers[to][faucetId];

        if(token != faucetData.token) {
            return false;
        }

        uint48 refreshInterval =  faucetData.refreshInterval;
        uint256 spendLimit = faucetData.limitAmount;

        uint48 lastUsed = faucetUser.lastUsed;
        uint256 currentUsage = faucetUser.limitUsed;
        
        if(block.timestamp < faucetData.validAfter || block.timestamp > faucetData.validUntil) {
            return false;
        }


        if (refreshInterval == 0 || lastUsed + refreshInterval > block.timestamp) {
            // We either don't have a refresh interval, or the current one is still active.

            // Must re-check the limits to handle changes due to other user ops.
            // We manually check for overflows here to give a more informative error message.
            uint256 newTotalUsage;
            unchecked {
                newTotalUsage = newUsage + currentUsage;
            }
            if (newTotalUsage < newUsage || newTotalUsage > spendLimit) {
                // If we overflow, or if the limit is exceeded, fail here and revert in the parent context.
                return false;
            }

            // We won't update the refresh interval last used variable now, so just update the spend limit.
            faucetUser.limitUsed = newTotalUsage;
        } else {
            // We have a interval active that is currently resetting.
            // Must re-check the amount to handle changes due to other user ops.
            // It only needs to fit within the new refresh interval, since the old one has passed.
            if (newUsage > spendLimit) {
                return false;
            }

            // The refresh interval has passed, so we can reset the spend limit to the new usage.
            faucetUser.limitUsed = newUsage;
            faucetUser.lastUsed = uint48(block.timestamp);
        }
        faucetUser.exists = true;

        return true;
    }

    function listFaucets() external view returns (FaucetData[] memory) {
        return faucets;
    }

    function name() external pure returns (string memory) {
        return "SpendLimitSession";
    }

    function version() external pure returns (string memory) {
        return "0.0.1";
    }

    function isModuleType(uint256 typeID) external pure override returns (bool) {
        return typeID == TYPE_VALIDATOR || typeID == TYPE_EXECUTOR;
    }

    function isInitialized(address smartAccount) external view returns (bool) { }
}