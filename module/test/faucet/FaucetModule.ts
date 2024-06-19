import { expect } from 'chai'
import { deployments, ethers } from 'hardhat'
import { getTestSafe, getEntryPoint, getTestToken, getSafe7579, getSafeFaucetModule, getTestSW, getMockSWSingleton } from '../utils/setup'
import { logGas } from '../../src/utils/execution'
import {
  buildUnsignedUserOpTransaction,
} from '../../src/utils/userOp'
import execSafeTransaction from '../utils/execSafeTransaction';
import { ZeroAddress } from 'ethers';
import { Hex, pad } from 'viem'
import { token } from '../../typechain-types/@openzeppelin/contracts'
import { getBalance } from 'viem/_types/actions/public/getBalance'


describe('Spendlimit session key - Basic tests', () => {
  const setupTests = deployments.createFixture(async ({ deployments }) => {
    await deployments.fixture()

    const [user1, user2, relayer] = await ethers.getSigners()
    let entryPoint = await getEntryPoint()

    entryPoint = entryPoint.connect(relayer)
    const faucetModule = await getSafeFaucetModule()
    const safe7579 = await getSafe7579()
    const testToken = await getTestToken()
    const safe = await getTestSafe(user1, await safe7579.getAddress(), await safe7579.getAddress())
    const testSafe = await getTestSafe(user1, await safe7579.getAddress(), await safe7579.getAddress())
    const cbSW = await getTestSW(user1)
    const sbSWSingleton = await getMockSWSingleton()

    return {
      testToken,
      user1,
      user2,
      safe,
      testSafe,
      cbSW,
      sbSWSingleton,
      relayer,
      faucetModule,
      safe7579,
      entryPoint,
    }
  })


    it('should add a spendlimit validator and execute ops with signatures', async () => {
      const { user1, safe, cbSW, testSafe, faucetModule, sbSWSingleton, safe7579, entryPoint, relayer } = await setupTests()

      await entryPoint.depositTo(await safe.getAddress(), { value: ethers.parseEther('1.0') })

      await user1.sendTransaction({ to: await safe.getAddress(), value: ethers.parseEther('1') })


      const abi = [
        'function execute(uint256 faucetId, address to, uint256 value, bytes calldata data) external',
      ]
      
      const execCallData = new ethers.Interface(abi).encodeFunctionData('execute', [0, await user1.address, ethers.parseEther('1'), '0x' as Hex])

      const newCall = {target: await faucetModule.getAddress() as Hex, value: 0, callData: execCallData as Hex}
     
      const currentTime = Math.floor(Date.now()/1000)
      const faucetData = {account: await safe.getAddress(), token: ZeroAddress, validAfter: 0, validUntil: currentTime + 30, limitAmount: ethers.parseEther('1'), refreshInterval: 0, eoa: {singletons: [], versions: [], supported: true}, safe: {singletons: [], versions: ["1.3.0", "1.4.1"], supported: true}, cbSW: {singletons: [await sbSWSingleton.getAddress()], versions: [], supported: false} }


      await execSafeTransaction(safe, await safe7579.initializeAccount.populateTransaction([], [], [], [], {registry: ZeroAddress, attesters: [], threshold: 0}));

      await execSafeTransaction(safe, {to: await safe.getAddress(), data:  ((await safe7579.installModule.populateTransaction(1, await faucetModule.getAddress(), '0x')).data as string), value: 0});
      await execSafeTransaction(safe, {to: await safe.getAddress(), data:  ((await safe7579.installModule.populateTransaction(2, await faucetModule.getAddress(), '0x')).data as string), value: 0});
      await execSafeTransaction(safe, await faucetModule.addFaucet.populateTransaction(faucetData))
      

      const key = BigInt(pad(await faucetModule.getAddress() as Hex, {
          dir: "right",
          size: 24,
        }) || 0
      )
      const currentNonce = await entryPoint.getNonce(await safe.getAddress(), key);

      let userOp = buildUnsignedUserOpTransaction(await safe.getAddress(), currentNonce, newCall)
      
      await logGas('Execute UserOp without a prefund payment', entryPoint.handleOps([userOp], relayer))
      expect(await ethers.provider.getBalance(await safe.getAddress())).to.be.eq(ethers.parseEther('0'))


    })


    it('should add a spendlimit validator and execute ops with signatures for a token', async () => {
      const { user1, safe, cbSW, testSafe, testToken, user2, faucetModule, sbSWSingleton, safe7579, entryPoint, relayer } = await setupTests()

      await entryPoint.depositTo(await safe.getAddress(), { value: ethers.parseEther('1.0') })

      await testToken.transfer(await safe.getAddress(), ethers.parseEther('5') )

      const abi = [
        'function execute(uint256 faucetId, address to, uint256 value, bytes calldata data) external',
      ]

      const ERC20_ABI = [
        'function transfer(address to, uint256 amount) external'      ]

      const callDataa = new ethers.Interface(ERC20_ABI).encodeFunctionData('transfer', [user2.address, ethers.parseEther('5')])

      const execCallData = new ethers.Interface(abi).encodeFunctionData('execute', [0, await testToken.getAddress(), 0, callDataa])

      const newCall = {target: await faucetModule.getAddress() as Hex, value: 0, callData: execCallData as Hex}
     
      const currentTime = Math.floor(Date.now()/1000)
      const faucetData = {account: await safe.getAddress(), token: await testToken.getAddress(), validAfter: 0, validUntil: currentTime + 30, limitAmount: ethers.parseEther('5'), refreshInterval: 0, eoa: {singletons: [], versions: [], supported: true}, safe: {singletons: [], versions: ["1.3.0", "1.4.1"], supported: true}, cbSW: {singletons: [await sbSWSingleton.getAddress()], versions: [], supported: false} }

      await execSafeTransaction(safe, await safe7579.initializeAccount.populateTransaction([], [], [], [], {registry: ZeroAddress, attesters: [], threshold: 0}));

      await execSafeTransaction(safe, {to: await safe.getAddress(), data:  ((await safe7579.installModule.populateTransaction(1, await faucetModule.getAddress(), '0x')).data as string), value: 0})
      await execSafeTransaction(safe, {to: await safe.getAddress(), data:  ((await safe7579.installModule.populateTransaction(2, await faucetModule.getAddress(), '0x')).data as string), value: 0})
      await execSafeTransaction(safe, await faucetModule.addFaucet.populateTransaction(faucetData))

      const key = BigInt(pad(await faucetModule.getAddress() as Hex, {
          dir: "right",
          size: 24,
        }) || 0
      )
      const currentNonce = await entryPoint.getNonce(await safe.getAddress(), key);


      let userOp = buildUnsignedUserOpTransaction(await safe.getAddress(), currentNonce, newCall)

      await logGas('Execute UserOp without a prefund payment', entryPoint.handleOps([userOp], relayer))

      expect(await testToken.balanceOf(await safe.getAddress())).to.be.eq(ethers.parseEther('0'))


    })



    it('should execute multiple faucet transactions within limit and time interval', async () => {
      const { user1, safe, cbSW, faucetModule, sbSWSingleton, safe7579, entryPoint, relayer } = await setupTests()

      await entryPoint.depositTo(await safe.getAddress(), { value: ethers.parseEther('1.0') })

      await user1.sendTransaction({ to: await safe.getAddress(), value: ethers.parseEther('1') })

      const abi = [
        'function execute(uint256 faucetId, address to, uint256 value, bytes calldata data) external',
      ]

      const execCallData = new ethers.Interface(abi).encodeFunctionData('execute', [0, await cbSW.getAddress(), ethers.parseEther('0.5'), '0x' as Hex])

      const newCall = {target: await faucetModule.getAddress() as Hex, value: 0, callData: execCallData as Hex}
     
      const currentTime = Math.floor(Date.now()/1000)
      const faucetData = {account: await safe.getAddress(), token: ZeroAddress, validAfter: 0, validUntil: currentTime + 30, limitAmount: ethers.parseEther('1'), refreshInterval: 0, eoa: {singletons: [], versions: [], supported: false}, safe: {singletons: [], versions: ["1.3.0", "1.4.1"], supported: false}, cbSW: {singletons: [await sbSWSingleton.getAddress()], versions: [], supported: true} }


      await execSafeTransaction(safe, await safe7579.initializeAccount.populateTransaction([], [], [], [], {registry: ZeroAddress, attesters: [], threshold: 0}));

      await execSafeTransaction(safe, {to: await safe.getAddress(), data:  ((await safe7579.installModule.populateTransaction(1, await faucetModule.getAddress(), '0x')).data as string), value: 0})
      await execSafeTransaction(safe, {to: await safe.getAddress(), data:  ((await safe7579.installModule.populateTransaction(2, await faucetModule.getAddress(), '0x')).data as string), value: 0})
      await execSafeTransaction(safe, await faucetModule.addFaucet.populateTransaction(faucetData))      
      
      const key = BigInt(pad(await faucetModule.getAddress() as Hex, {
          dir: "right",
          size: 24,
        }) || 0
      )
      let currentNonce = await entryPoint.getNonce(await safe.getAddress(), key);


      let userOp = buildUnsignedUserOpTransaction(await safe.getAddress(), currentNonce, newCall)

      let typedDataHash = ethers.getBytes(await entryPoint.getUserOpHash(userOp))
      userOp.signature = await user1.signMessage(typedDataHash)
      
      await logGas('Execute UserOp without a prefund payment', entryPoint.handleOps([userOp], relayer))
      expect(await ethers.provider.getBalance(await safe.getAddress())).to.be.eq(ethers.parseEther('0.5'))


      currentNonce = await entryPoint.getNonce(await safe.getAddress(), key);
      userOp = buildUnsignedUserOpTransaction(await safe.getAddress(), currentNonce, newCall)

      await logGas('Execute UserOp without a prefund payment', entryPoint.handleOps([userOp], relayer))
      expect(await ethers.provider.getBalance(await safe.getAddress())).to.be.eq(ethers.parseEther('0'))

    })


    it('should execute multiple faucet transactions within limit and after refresh interval', async () => {
      const { user1, safe, cbSW, testSafe, faucetModule, sbSWSingleton, safe7579, entryPoint, relayer } = await setupTests()

      await entryPoint.depositTo(await safe.getAddress(), { value: ethers.parseEther('1.0') })

      await user1.sendTransaction({ to: await safe.getAddress(), value: ethers.parseEther('1.5') })

      const abi = [
        'function execute(uint256 faucetId, address to, uint256 value, bytes calldata data) external',
      ]

      let execCallData = new ethers.Interface(abi).encodeFunctionData('execute', [0, await cbSW.getAddress(), ethers.parseEther('0.5'), '0x' as Hex])

      let newCall = {target: await faucetModule.getAddress() as Hex, value: 0, callData: execCallData as Hex}
     
      const currentTime = Math.floor(Date.now()/1000)
      const faucetData = {account: await safe.getAddress(), token: ZeroAddress, validAfter: 0, validUntil: currentTime + 100, limitAmount: ethers.parseEther('0.5'), refreshInterval: 5, eoa: {singletons: [], versions: [], supported: false}, safe: {singletons: [], versions: ["1.3.0", "1.4.1"], supported: true}, cbSW: {singletons: [await sbSWSingleton.getAddress()], versions: [], supported: true} }


      await execSafeTransaction(safe, await safe7579.initializeAccount.populateTransaction([], [], [], [], {registry: ZeroAddress, attesters: [], threshold: 0}));

      await execSafeTransaction(safe, {to: await safe.getAddress(), data:  ((await safe7579.installModule.populateTransaction(1, await faucetModule.getAddress(), '0x')).data as string), value: 0})
      await execSafeTransaction(safe, {to: await safe.getAddress(), data:  ((await safe7579.installModule.populateTransaction(2, await faucetModule.getAddress(), '0x')).data as string), value: 0})
      await execSafeTransaction(safe, await faucetModule.addFaucet.populateTransaction(faucetData))
      

      const key = BigInt(pad(await faucetModule.getAddress() as Hex, {
          dir: "right",
          size: 24,
        }) || 0
      )
      let currentNonce = await entryPoint.getNonce(await safe.getAddress(), key);


      let userOp = buildUnsignedUserOpTransaction(await safe.getAddress(), currentNonce, newCall)

      
      await logGas('Execute UserOp without a prefund payment', entryPoint.handleOps([userOp], relayer))
      expect(await ethers.provider.getBalance(await safe.getAddress())).to.be.eq(ethers.parseEther('1'))

      execCallData = new ethers.Interface(abi).encodeFunctionData('execute', [0, await testSafe.getAddress(), ethers.parseEther('0.5'), '0x' as Hex])

      newCall = {target: await faucetModule.getAddress() as Hex, value: 0, callData: execCallData as Hex}
     
      currentNonce = await entryPoint.getNonce(await safe.getAddress(), key);
      userOp = buildUnsignedUserOpTransaction(await safe.getAddress(), currentNonce, newCall)

      await logGas('Execute UserOp without a prefund payment', entryPoint.handleOps([userOp], relayer))
      expect(await ethers.provider.getBalance(await safe.getAddress())).to.be.eq(ethers.parseEther('0.5'))


        // Wait for 5 seconds for the next refresh interval
        await delay(5000);

      currentNonce = await entryPoint.getNonce(await safe.getAddress(), key);
      userOp = buildUnsignedUserOpTransaction(await safe.getAddress(), currentNonce, newCall)

      await logGas('Execute UserOp without a prefund payment', entryPoint.handleOps([userOp], relayer))
      expect(await ethers.provider.getBalance(await safe.getAddress())).to.be.eq(ethers.parseEther('0'))

    })
  
})

function delay(timeout = 10000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}