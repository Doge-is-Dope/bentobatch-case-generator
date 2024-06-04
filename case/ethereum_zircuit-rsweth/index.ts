import type { Abi } from 'abitype'
import {
  Context,
  BatchCase,
  TagTitle,
  Tx,
  InputType,
  WalletType,
} from '@/cases/types'
import { balance, decimalValidator, max } from '@/models/cases/v3/utils'
import { ReferalAccount } from '@/models/cases/v3/constants'
import { encodeFunctionData, formatEther, parseUnits } from 'viem'
import RswETH from './abi/RswETH.json'
import ZircuitPool from './abi/ZircuitPool.json'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'

const rswETHAddr = '0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0'
const zircuitAddr = '0xF047ab4c75cebf0eB9ed34Ae2c186f3611aEAfa6'

const tags = [
  { title: TagTitle.Defi },
  { title: TagTitle.Restaking },
  { title: TagTitle.Benefits },
  { title: TagTitle.Official },
  { title: TagTitle.Gas },
]

const zircuitRswETH: BatchCase = {
  id: 'zircuit_rsweth',
  name: '🔥 Earn extra 15% Zircuit Points with Swell Restaking',
  description:
    'Restake ETH to Swell and deposit $rswETH to Zircuit. Earn Staking APR + Restaking APR ＋Eigenlayer + Swell + Zircuit + BENTO BOX with ETH in one Click',
  details: BATCH_DETAILS,
  website: {
    title: 'Zircuit',
    url: 'https://stake.zircuit.com/',
  },
  tags,
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  networkId: 1,
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
    let txs: Tx[] = []

    const v = parseUnits(inputs[0], 18)

    const estimateRSWETHAmount = (v * BigInt(992)) / BigInt(1000)

    txs.push({
      name: 'Wrap',
      description: `${formatEther(v)} ETH to rswETH`,
      to: rswETHAddr,
      value: v,
      data: encodeFunctionData({
        abi: RswETH,
        functionName: 'depositWithReferral',
        args: [ReferalAccount],
      }),
      abi: RswETH as Abi,
    })

    txs.push({
      name: 'Approve',
      description: `${formatEther(estimateRSWETHAmount)} rswETH to Zircuit`,
      to: rswETHAddr,
      // @ts-ignore-next-line
      value: 0n,
      data: encodeFunctionData({
        abi: RswETH,
        functionName: 'approve',
        args: [zircuitAddr, estimateRSWETHAmount],
      }),
      abi: RswETH as Abi,
      meta: {
        highlights: ['Zircuit'],
      },
    })

    txs.push({
      name: 'Deposit',
      description: `${formatEther(estimateRSWETHAmount)} rswETH to Zircuit`,
      to: zircuitAddr,
      // @ts-ignore-next-line
      value: 0n,
      data: encodeFunctionData({
        abi: ZircuitPool,
        functionName: 'depositFor',
        args: [rswETHAddr, context.account.address, estimateRSWETHAmount],
      }),
      abi: ZircuitPool as Abi,
      meta: {
        highlights: ['Zircuit'],
      },
    })

    return txs
  },
  previewTx: [
    {
      name: 'Wrap',
      description: 'ETH to rswETH',
      to: rswETHAddr,
    },
    {
      name: 'Approve',
      description: 'rswETH to Zircuit',
      to: rswETHAddr,
      meta: {
        highlights: ['Zircuit'],
      },
    },
    {
      name: 'Deposit',
      description: 'rswETH to Zircuit',
      to: zircuitAddr,
      meta: {
        highlights: ['Zircuit'],
      },
    },
  ],
  gasSaved: 31,
  setActions: () => {
    return [
      {
        href: 'https://stake.zircuit.com/?ref=BENTOZ',
        text: 'Check Points (Zircuit)',
      },
      {
        href: 'https://app.swellnetwork.io/portfolio',
        text: 'Check Assets (Swell)',
      },
    ]
  },
}

export default [zircuitRswETH]
