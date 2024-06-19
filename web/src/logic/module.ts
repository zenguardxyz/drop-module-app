import { Contract, ZeroAddress, parseEther, parseUnits, getBytes, JsonRpcProvider, toBeHex, Interface } from "ethers";
import { ethers, utils } from 'ethersv5';
import { BaseTransaction } from '@safe-global/safe-apps-sdk';
import { getSafeInfo, isConnectedToSafe, submitTxs } from "./safeapp";
import { isModuleEnabled, buildEnableModule, buildUpdateFallbackHandler, isModuleInstalled } from "./safe";
import { getJsonRpcProvider, getProvider } from "./web3";
import Safe7579 from "./Safe7579.json"
import EntryPoint from "./EntryPoint.json"
import SafeFaucetModule from "./SafeFaucetModule.json"
import {  getTokenDecimals, publicClient } from "./utils";
import {  buildUnsignedUserOpTransaction } from "@/utils/userOp";
import {  Hex, pad } from "viem";
import { sepolia } from 'viem/chains'
import { ENTRYPOINT_ADDRESS_V07, getPackedUserOperation, UserOperation, getAccountNonce } from 'permissionless'
import { sendUserOperation } from "./permissionless";

const safe7579Module = "0x94952C0Ea317E9b8Bca613490AF25f6185623284"
const safeFaucetModule = "0xcf2e2945838dC48Dafe3d4973A88bd5C979702B1"
const smartWalletImp = "0x000100abaad02f1cfC8Bbe32bD5a564817339E72"



export function generateRandomString(length: number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }
    return result;
}


/**
 * Generates a deterministic key pair from an arbitrary length string
 *
 * @param {string} string - The string to generate a key pair from
 * @returns {Object} - An object containing the address and privateKey
 */
export function generateKeysFromString(string: string) {
    const privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(string)) // v5
    const wallet = new ethers.Wallet(privateKey)
    return {
        address: wallet.address,
        privateKey: privateKey,
    }
}




/**
 * Hashes a plain address, adds an Ethereum message prefix, hashes it again and then signs it
 */
export async function signAddress(string: string, privateKey: string) {
    const stringHash = ethers.utils.solidityKeccak256(['address'], [string]) // v5
    const stringHashbinary = ethers.utils.arrayify(stringHash) // v5
    const signer = new ethers.Wallet(privateKey)
    const signature = await signer.signMessage(stringHashbinary) // this calls ethers.hashMessage and prefixes the hash
    return signature
}



const fetchFaucets = async (chainId: string ): Promise<any> => {


    const provider = await getJsonRpcProvider(chainId)
    
    const safeValidator = new Contract(
        safeFaucetModule,
        SafeFaucetModule.abi,
        provider
    )

    return await safeValidator.listFaucets()
}




export const sendTransaction = async (chainId: string, recipient: string, amount: bigint, data: any, walletProvider: any, safeAccount: string): Promise<any> => {

   
    const abi = [
        'function execute(uint256 faucetId, address to, uint256 value, bytes calldata data) external',
      ]

    const execCallData = new Interface(abi).encodeFunctionData('execute', [2, recipient, amount, data])

    const call = { target: safeFaucetModule as Hex, value: 0, callData: execCallData as Hex }

    const key = BigInt(pad(safeFaucetModule as Hex, {
        dir: "right",
        size: 24,
      }) || 0
    )
    
    const nonce = await getAccountNonce(publicClient(parseInt(chainId)), {
        sender: safeAccount as Hex,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        key: key
    })


    let unsignedUserOp = buildUnsignedUserOpTransaction(
        safeAccount as Hex,
        call,
        nonce,
      )

      const signUserOperation = async function signUserOperation(userOperation: UserOperation<"v0.7">) {
        return "0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    
    }

    const userOperationHash = await sendUserOperation(chainId, unsignedUserOp, signUserOperation )

    return userOperationHash;

}


const buildInitSafe7579 = async ( ): Promise<BaseTransaction> => {

    
    const info = await getSafeInfo()

    const provider = await getProvider()
    // Updating the provider RPC if it's from the Safe App.
    const chainId = (await provider.getNetwork()).chainId.toString()
    const bProvider = await getJsonRpcProvider(chainId)

    const safeValidator = new Contract(
        safe7579Module,
        Safe7579.abi,
        bProvider
    )

    return {
        to: safe7579Module,
        value: "0",
        data: (await safeValidator.initializeAccount.populateTransaction([], [], [], [], {registry: ZeroAddress, attesters: [], threshold: 0})).data
    }
}


const buildInstallValidator = async (): Promise<BaseTransaction> => {

    
    const info = await getSafeInfo()

    const provider = await getProvider()
    // Updating the provider RPC if it's from the Safe App.
    const chainId = (await provider.getNetwork()).chainId.toString()
    const bProvider = await getJsonRpcProvider(chainId)

    const safeValidator = new Contract(
        safe7579Module,
        Safe7579.abi,
        bProvider
    )

    return {
        to: info.safeAddress,
        value: "0",
        data: (await safeValidator.installModule.populateTransaction(1, safeFaucetModule, '0x')).data
    }
}

const buildInstallExecutor = async ( ): Promise<BaseTransaction> => {

    
    const info = await getSafeInfo()

    const provider = await getProvider()
    // Updating the provider RPC if it's from the Safe App.
    const chainId = (await provider.getNetwork()).chainId.toString()
    const bProvider = await getJsonRpcProvider(chainId)

    const safeValidator = new Contract(
        safe7579Module,
        Safe7579.abi,
        bProvider
    )

    return {
        to: info.safeAddress,
        value: "0",
        data: (await safeValidator.installModule.populateTransaction(2, safeFaucetModule, '0x')).data
    }
}


const buildAddFaucet = async (token: string, amount: string, refreshInterval: number, validUntil: number ): Promise<BaseTransaction> => {

    
    const info = await getSafeInfo()
    const provider = await getProvider()

    // const sessionData = {account: info.safeAddress, token: token, validAfter: validAfter, validUntil: validUntil, limitAmount: parseUnits(amount, token!= ZeroAddress ? await getTokenDecimals(token, provider) : 'ether'), limitUsed: 0, lastUsed: 0, refreshInterval: refreshInterval }
    const faucetData = {account: info.safeAddress, token: token, validAfter: 0, validUntil: validUntil, limitAmount: parseUnits(amount, token!= ZeroAddress ? await getTokenDecimals(token, provider) : 'ether'), refreshInterval: refreshInterval, eoa: {singletons: [], versions: [], supported: true}, safe: {singletons: [], versions: ["1.3.1", "1.4.1"], supported: true}, cbSW: {singletons: [smartWalletImp], versions: [], supported: false} }


    // Updating the provider RPC if it's from the Safe App.
    const chainId = (await provider.getNetwork()).chainId.toString()
    const bProvider = await getJsonRpcProvider(chainId)

    const safeFaucet = new Contract(
        safeFaucetModule,
        SafeFaucetModule.abi,
        bProvider
    )

    return {
        to: safeFaucetModule,
        value: "0",
        data: (await safeFaucet.addFaucet.populateTransaction(faucetData)).data
    }
}






export const addFaucetModule = async (token: string, amount: string, refreshInterval: number, validUntil: number) => {

    
    if (!await isConnectedToSafe()) throw Error("Not connected to a Safe")

    const info = await getSafeInfo()

    const txs: BaseTransaction[] = []


    if (!await isModuleEnabled(info.safeAddress, safe7579Module)) {
        txs.push(await buildEnableModule(info.safeAddress, safe7579Module))
        txs.push(await buildUpdateFallbackHandler(info.safeAddress, safe7579Module))
        txs.push(await buildInitSafe7579())
    }
    else if (!await isModuleInstalled(info.safeAddress, safeFaucetModule, 1)) {
        txs.push(await buildInstallValidator())
        txs.push(await buildInstallExecutor())
        }
        
        txs.push(await buildAddFaucet(token, amount, refreshInterval, validUntil))



    const provider = await getProvider()
    // Updating the provider RPC if it's from the Safe App.
    const chainId = (await provider.getNetwork()).chainId.toString()

    if (txs.length > 0)  
    await submitTxs(txs)
}
