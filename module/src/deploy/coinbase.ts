import { DeployFunction } from 'hardhat-deploy/types'

const deploy: DeployFunction = async ({ deployments, getNamedAccounts, network }) => {
  if (!network.tags.safe) {
    return
  }

  const { deployer } = await getNamedAccounts()
  const { deploy } = deployments

  const implementation = await deploy('CoinbaseSmartWallet', {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: true,
  })



await deploy('CoinbaseSmartWalletFactory', {
  from: deployer,
  args: [implementation.address],
  log: true,
  deterministicDeployment: true,
})

}



deploy.tags = ['safe']

export default deploy
