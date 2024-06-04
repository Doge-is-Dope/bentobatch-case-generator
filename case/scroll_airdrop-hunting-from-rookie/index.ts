import {
  Context,
  BatchCase,
  InputType,
  Tx,
  TagTitle,
  WalletType,
} from '@/models/cases/v3/types'
import { balance, decimalValidator, max } from '@/models/cases/v3/utils'
import { parseUnits } from 'viem'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './rookie.details'
import {
  approveUSDCToAmbient,
  wrapETH,
  unwrapETH,
  swapUSDCToETHByAmbient,
  swapETHToUSDCByAmbient,
} from './utils'

const scrollChainID = 0x82750

// NOTE: following address only for Scroll chain
const usdcAddress = '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4'
const ambientSwapAddress = '0xaaaaaaaacb71bf2c8cae522ea5fa455571a74106'
const wETHAddress = '0x5300000000000000000000000000000000000004'

const tags = [{ title: TagTitle.Dex }, { title: TagTitle.Swap }]

const scrollAirdropHuntingRookie: BatchCase = {
  id: 'scroll_airdrop_hunting_rookie',
  name: 'On-chain Interaction on Scroll : Rookie',
  description:
    'Potential: ⭐⭐⭐ / Number of Contract Interacted: 2 / On-Chain Volume Boost: 4x / Click Saved: 4',
  details: BATCH_DETAILS,
  website: {
    title: 'Scroll',
    url: 'https://scroll.io/',
  },
  tags,
  curatorTwitter: {
    name: '@hank06171',
    url: 'https://twitter.com/hank06171',
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  networkId: scrollChainID,
  atomic: true,
  renderExpiry: 15,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'USDC Amount',
      inputType: InputType.ERC20Amount,
      description: 'Amount to swap, wrap and unwrap',
      validate: decimalValidator(6, BigInt(0)),
      options: {
        token: usdcAddress,
      },
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
    const inputUSDCAmount = parseUnits(inputs[0], 6)

    let txs: Tx[] = []

    // 1
    txs.push(approveUSDCToAmbient(inputUSDCAmount))

    // 2
    const { tx: swapUSDCToETHTx, ethMinOut } =
      await swapUSDCToETHByAmbient(inputUSDCAmount)
    txs.push(swapUSDCToETHTx)

    // 3
    txs.push(wrapETH(ethMinOut))

    // 4
    txs.push(unwrapETH(ethMinOut))

    // 5
    const { tx: swapETHToUSDCTx } = await swapETHToUSDCByAmbient(ethMinOut)
    txs.push(swapETHToUSDCTx)

    return txs
  },
  previewTx: [
    {
      name: 'Approve',
      description: 'USDC to Ambient',
      to: usdcAddress,
      meta: {
        highlights: ['Ambient'],
      },
    },
    {
      name: 'Swap',
      description: 'USDC to ETH on Ambient',
      to: ambientSwapAddress,
      meta: {
        highlights: ['Ambient'],
      },
    },
    {
      name: 'Wrap',
      description: 'ETH to WETH',
      to: wETHAddress,
    },
    {
      name: 'Unwrap',
      description: 'WETH to ETH',
      to: wETHAddress,
    },
    {
      name: 'Swap',
      description: 'ETH to USDC on Ambient',
      to: ambientSwapAddress,
      meta: {
        highlights: ['Ambient'],
      },
    },
  ],
}

export default scrollAirdropHuntingRookie
