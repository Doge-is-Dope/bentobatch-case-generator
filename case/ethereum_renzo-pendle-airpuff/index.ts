import type { Abi } from 'abitype'
import {
  Context,
  BatchCase,
  InputType,
  Tx,
  TagTitle,
  WalletType,
} from '@/models/cases/v3/types'
import {
  balance,
  decimalValidator,
  getDecimals,
  max,
} from '@/models/cases/v3/utils'
import {
  Address,
  createPublicClient,
  encodeFunctionData,
  formatEther,
  formatUnits,
  fromHex,
  getContract,
  http,
  parseUnits,
} from 'viem'
import RenzoOracle from './abi/RenzoOracle.json'
import RenzoRestakeManager from '../zircuit-renzo/abi/RenzoRestakeManager.json'
import ezETH from '../zircuit-renzo/abi/EZETH.json'
import PendlePrincipalToken from './abi/PendlePrincipalToken.json'
import AirPuffPool from './abi/AirPuffPool.json'
import { ReferalAccount } from '../constants'
// import BATCH_DETAILS from './index.details'
import {
  PendleOutputType,
  PendleSwapContext,
  getMarketAddr,
  swapExactToken,
} from '../prebuilt-tx/pendle'
import { mainnet } from 'viem/chains'
import { AddressNotFoundError } from '../error'

const tags = [
  { title: TagTitle.Official },
  { title: TagTitle.Benefits },
  { title: TagTitle.Defi },
  { title: TagTitle.Restaking },
]

const ptTokenName = 'PT-ezETH'

const renzoRestakeManagerAddr = '0x74a09653A083691711cF8215a6ab074BB4e99ef5'
const ezEthAddr = '0xbf5495Efe5DB9ce00f80364C8B423567e58d2110'
const ezETHSYAddr = '0x22e12a50e3ca49fb183074235cb1db84fe4c716d'
const ptEzETHAddr = '0xf7906F274c174A52d444175729E3fa98f9bde285'
const airPuffPoolAddr = '0xebdaDFC590393938b601a9738C3107460838e880'

const renzoPendleAirPuff: BatchCase = {
  id: 'renzo_pendle_airpuff',
  name: 'Earn 2.5x AirPuff points with Pendle PT',
  description:
    'Swap your ETH to ezETH with just one click, then deposit it into Pendle. After that, deposit PT-ezETH into AirPuff.',
  // details: BATCH_DETAILS,
  website: {
    title: 'AirPuff',
    url: 'https://www.airpuff.io/',
  },
  tags,
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  networkId: mainnet.id,
  atomic: true,
  renderExpiry: 15,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'ETH Amount',
      inputType: InputType.NativeAmount,
      description: 'Amount to stake',
      validate: decimalValidator(18, BigInt(0)),
      actionContent: balance,
      actionButtons: [max],
    },
  ],
  render: async (context: Context) => {
    /*
    WARNING: when inputs are configured with an input that includes `isOptional: true`,
    make sure to handle the case where the correspond value in inputs may be undefined
    `context.inputs as string[]` only suitable for inputs that are not configured with `isOptional: true`
    */
    const inputs = context.inputs as string[]
    const userAddress = context.account.address
    if (!userAddress) throw new AddressNotFoundError()
    const txs: Tx[] = []

    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    })

    const renzoRestakeManager = getContract({
      address: renzoRestakeManagerAddr,
      abi: RenzoRestakeManager,
      client: client,
    })

    const ezEth = getContract({
      address: ezEthAddr,
      abi: ezETH,
      client: client,
    })

    const ethInputAmount = parseUnits(inputs[0], 18)
    const renzoOracleAddr =
      (await renzoRestakeManager.read.renzoOracle()) as Address
    const renzoOracle = getContract({
      address: renzoOracleAddr,
      abi: RenzoOracle,
      client: client,
    })

    const tvls = (await renzoRestakeManager.read.calculateTVLs()) as any[]
    const ezEthTotalSupply = (await ezEth.read.totalSupply()) as bigint
    const ezEthAmount = (await renzoOracle.read.calculateMintAmount([
      tvls[2],
      ethInputAmount,
      ezEthTotalSupply,
    ])) as bigint

    const ezETHDecimals = await getDecimals(ezEthAddr, context.chain)

    const referralId = fromHex(ReferalAccount, 'bigint')
    txs.push({
      name: 'Stake',
      description: `${formatEther(ethInputAmount)} ETH to ${formatUnits(ezEthAmount, ezETHDecimals)} ezETH on Renzo`,
      to: renzoRestakeManager.address,
      value: ethInputAmount,
      data: encodeFunctionData({
        abi: renzoRestakeManager.abi,
        functionName: 'depositETH',
        args: [referralId],
      }),
      abi: renzoRestakeManager.abi as Abi,
      meta: {
        highlights: ['Renzo'],
      },
    })

    const pendleMarketAddr = await getMarketAddr({
      chainId: context.chain.id.toString(),
      syTokenAddr: ezETHSYAddr,
    })

    const pendleOutput = PendleOutputType.Pt
    const pendleContext: PendleSwapContext = {
      chain: context.chain,
      receiverAddr: userAddress,
      marketAddr: pendleMarketAddr,
      tokenInAddr: ezEthAddr,
      amountTokenIn: ezEthAmount,
      syTokenInAddr: ezEthAddr,
      slippage: 0.005,
    }

    const txInfo = await swapExactToken(pendleOutput, pendleContext, {
      tokenInName: 'ezETH',
      outputTokenName: ptTokenName,
    })

    const ezEthAllowance = (await ezEth.read.allowance([
      context.account.address,
      txInfo.routerAddress,
    ])) as bigint

    if (ezEthAmount > ezEthAllowance) {
      txs.push({
        name: `Approve`,
        description: `${formatUnits(ezEthAmount, ezETHDecimals)} ezETH to Pendle`,
        to: ezEth.address,
        value: 0n,
        data: encodeFunctionData({
          abi: ezEth.abi,
          functionName: 'approve',
          args: [txInfo.routerAddress, ezEthAmount],
        }),
        abi: ezEth.abi as Abi,
        meta: {
          highlights: ['Pendle'],
        },
      })
    }

    txs.push(txInfo.tx)
    const ptAmount = txInfo.outputTokenAmount

    const ptEzETHContract = getContract({
      address: ptEzETHAddr,
      abi: PendlePrincipalToken as Abi,
      client: client,
    })

    const ptEzETHAllowance = (await ptEzETHContract.read.allowance([
      userAddress,
      airPuffPoolAddr,
    ])) as bigint

    const ptDecimals = await getDecimals(ptEzETHAddr, context.chain)

    if (ptEzETHAllowance < ptAmount) {
      txs.push({
        name: `Approve`,
        description: `${formatUnits(ptAmount, ptDecimals)} ${ptTokenName} to AirPuff`,
        to: ptEzETHAddr,
        value: 0n,
        data: encodeFunctionData({
          abi: PendlePrincipalToken,
          functionName: 'approve',
          args: [airPuffPoolAddr, ptAmount],
        }),
        abi: PendlePrincipalToken as Abi,
        meta: {
          highlights: ['AirPuff'],
        },
      })
    }

    txs.push({
      name: `Deposit`,
      description: `${formatUnits(ptAmount, ptDecimals)} ${ptTokenName} to AirPuff`,
      to: airPuffPoolAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: AirPuffPool,
        functionName: 'openPosition',
        args: [ptAmount],
      }),
      abi: AirPuffPool as Abi,
      meta: {
        highlights: ['AirPuff'],
      },
    })

    return txs
  },
  previewTx: [
    {
      name: 'Stake',
      description: `ETH to ezETH on Renzo`,
      to: renzoRestakeManagerAddr,
      meta: {
        highlights: ['Renzo'],
      },
    },
    {
      name: `Approve`,
      description: `ezETH to Pendle`,
      to: ezEthAddr,
      meta: {
        highlights: ['Pendle'],
      },
    },
    {
      name: `Swap`,
      description: `ezETH to ${ptTokenName} on Pendle`,
      to: '0x888888888889758F76e7103c6CbF23ABbF58F946', // might expire, but use a fixed value for now
      meta: {
        highlights: ['Pendle'],
      },
    },
    {
      name: `Approve`,
      description: `${ptTokenName} to AirPuff`,
      to: airPuffPoolAddr,
      meta: {
        highlights: ['AirPuff'],
      },
    },
    {
      name: `Deposit`,
      description: `${ptTokenName} to AirPuff`,
      to: airPuffPoolAddr,
      meta: {
        highlights: ['AirPuff'],
      },
    },
  ],
  setActions: () => {
    return [
      {
        href: 'https://app.renzoprotocol.com/portfolio',
        text: 'Check Portfolio (Renzo)',
      },
      {
        href: 'https://app.airpuff.io/dashboard',
        text: 'Manage Position (AirPuff)',
      },
    ]
  },
}

export default [renzoPendleAirPuff]
