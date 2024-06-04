import {
  BatchCase,
  Context,
  Tx,
  InputType,
  TagTitle,
  WalletType,
} from '@/cases/types'
import { balance, decimalValidator, max } from '@/models/cases/v3/utils'
import { parseUnits, Address } from 'viem'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'
import {
  PendleOutputType,
  PendleSwapContext,
  getMarketAddr,
  swapExactToken,
} from '../prebuilt-tx/pendle'
import { arbitrum } from 'viem/chains'
import { AddressNotFoundError } from '../error'

const rsMarketAddr = '0x6F02C88650837C8dfe89F66723c4743E9cF833cd'
const ezMarketAddr = '0x60712e3C9136CF411C561b4E948d4d26637561e7'

const ethTokenAddr = '0x0000000000000000000000000000000000000000'
const rsEthSYTokenAddr = '0xf176fb51f4eb826136a54fdc71c50fcd2202e272'
const ezEthSYTokenAddr = '0x0de802e3d6cc9145a150bbdc8da9f988a98c5202'
const rsEthTokenAddr = '0x4186BFC76E2E237523CBC30FD220FE055156b41F'
const ezEthTokenAddr = '0x2416092f143378750bb29b79eD961ab195CcEea5'

const tags = [
  { title: TagTitle.Defi },
  { title: TagTitle.Staking },
  { title: TagTitle.Restaking },
]

const pendlePoints: BatchCase = {
  id: 'pendle_points',
  name: 'Earn Kelp Miles + Renzo ezPoints + EigenLayer Points with ETH',
  description:
    'Swap ETH to YT ezETH and YT rsETH on Pendle with one click to earn multiple points.',
  details: BATCH_DETAILS,
  website: {
    title: 'Pendle',
    url: 'https://app.pendle.finance/points',
  },
  tags,
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  networkId: arbitrum.id,
  atomic: true,
  renderExpiry: undefined,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'ETH Amount',
      inputType: InputType.NativeAmount,
      description: 'Amount to purchase YT rsETH',
      validate: decimalValidator(18, BigInt(0)),
      actionContent: balance,
      actionButtons: [max],
    },
    {
      name: 'ETH Amount',
      inputType: InputType.NativeAmount,
      description: 'Amount to purchase YT ezETH',
      validate: decimalValidator(18, BigInt(0)),
      actionContent: balance,
      actionButtons: [max],
    },
  ],
  render: async (context: Context) => {
    const userAddress = context.account.address
    if (!userAddress) throw new AddressNotFoundError()

    /*
    WARNING: when inputs are configured with an input that includes `isOptional: true`,
    make sure to handle the case where the correspond value in inputs may be undefined
    `context.inputs as string[]` only suitable for inputs that are not configured with `isOptional: true`
    */
    const inputs = context.inputs as string[]
    const txs: Tx[] = []
    const ytTokenNames = ['YT rsETH', 'YT ezETH']
    const slippage = 0.005

    const rsMarketAddr = await getMarketAddr({
      chainId: context.chain.id.toString(),
      syTokenAddr: rsEthSYTokenAddr,
    })

    const ezMarketAddr = await getMarketAddr({
      chainId: context.chain.id.toString(),
      syTokenAddr: ezEthSYTokenAddr,
    })

    const pendleContexts: PendleSwapContext[] = [
      // rsETH
      {
        chain: context.chain,
        receiverAddr: userAddress as Address,
        marketAddr: rsMarketAddr as Address,
        tokenInAddr: ethTokenAddr as Address,
        amountTokenIn: parseUnits(inputs[0], 18),
        syTokenInAddr: rsEthTokenAddr as Address,
        slippage: slippage,
      },
      // ezETH
      {
        chain: context.chain,
        receiverAddr: userAddress as Address,
        marketAddr: ezMarketAddr as Address,
        tokenInAddr: ethTokenAddr as Address,
        amountTokenIn: parseUnits(inputs[1], 18),
        syTokenInAddr: ezEthTokenAddr as Address,
        slippage: slippage,
      },
    ]

    await Promise.all(
      pendleContexts.map(async (pendleContext, index) => {
        const txInfo = await swapExactToken(
          PendleOutputType.Yt,
          pendleContext,
          {
            tokenInName: 'ETH',
            outputTokenName: ytTokenNames[index],
          }
        )
        txs.push(txInfo.tx)
      })
    )

    return txs
  },
  previewTx: [
    {
      name: `Swap`,
      description: `ETH to YT rsETH`,
      to: rsEthTokenAddr,
    },
    {
      name: `Swap`,
      description: `ETH to YT ezETH`,
      to: ezEthTokenAddr,
    },
  ],
  setActions: () => {
    return [
      {
        href: 'https://app.pendle.finance/trade/pools/0x4f43c77872db6ba177c270986cd30c3381af37ee/zap/in?chain=ethereum&isFromDashboard=true',
        text: 'Check Assets (Pendle)',
      },
    ]
  },
}

export default [pendlePoints]
