import type { Abi } from 'abitype'
import {
  Context,
  BatchCase,
  Tx,
  InputType,
  TagTitle,
  WalletType,
} from '@/cases/types'
import { balance, decimalValidator, max } from '@/cases/utils'
import { ReferalAccount } from '@/cases/constants'
import {
  createPublicClient,
  encodeFunctionData,
  formatEther,
  getContract,
  http,
  parseUnits,
} from 'viem'
import Lido from './abi/Lido.json'
import EigenpieStaking from './abi/EigenpieStaking.json'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'

const tags = [
  { title: TagTitle.Defi },
  { title: TagTitle.Staking },
  { title: TagTitle.Restaking },
]

// Lido
const stETHAddr = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'
// eigenpie
const eigenpieAddr = '0x24db6717dB1C75B9Db6eA47164D8730B63875dB7'

const eigenpieSTETH: BatchCase = {
  id: 'eigenpie_steth',
  name: 'Earn staking APR and Eigenpie points with ETH',
  description:
    'Stake on Lido and restake on Eigenpie to earn staking APR and Eigenpie Point.',
  details: BATCH_DETAILS,
  website: {
    title: 'Eigenpie',
    url: 'https://www.eigenlayer.magpiexyz.io/',
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

    const estimateSTETHAmount = (v * BigInt(992)) / BigInt(1000)
    const estimateMSTETHAmount =
      (estimateSTETHAmount * BigInt(990)) / BigInt(1000)

    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    })

    const eigenpieRestaking = getContract({
      address: eigenpieAddr,
      abi: EigenpieStaking,
      client: client,
    })

    txs.push({
      name: 'Stake',
      description: `${formatEther(v)} ETH to Lido`,
      to: stETHAddr,
      value: v,
      data: encodeFunctionData({
        abi: Lido,
        functionName: 'submit',
        args: [ReferalAccount],
      }),
      abi: Lido as Abi,
      meta: {
        highlights: ['Lido'],
      },
    })

    const { result: isPreDeposit }: { result: boolean } =
      await eigenpieRestaking.simulate.isPreDeposit()

    const minAmountToDeposit =
      (await eigenpieRestaking.read.minAmountToDeposit()) as bigint
    if (estimateSTETHAmount < minAmountToDeposit)
      throw new Error(
        `stETH is insufficient, the minimum amount of stETH is ${formatEther(minAmountToDeposit)}`
      )
    if (isPreDeposit) {
      throw new Error(
        'Eigenpie is in pre-deposit mode. Please try again later.'
      )
    } else {
      txs.push({
        name: 'Approve',
        description: `${formatEther(estimateSTETHAmount)} stETH to Eigenpie`,
        to: stETHAddr,
        // @ts-ignore-next-line
        value: 0n,
        data: encodeFunctionData({
          abi: Lido,
          functionName: 'approve',
          args: [eigenpieAddr, estimateSTETHAmount],
        }),
        abi: Lido as Abi,
        meta: {
          highlights: ['Eigenpie'],
        },
      })

      txs.push({
        name: 'Stake',
        description: `${formatEther(estimateSTETHAmount)} stETH to Eigenpie`,
        to: eigenpieAddr,
        // @ts-ignore-next-line
        value: 0n,
        data: encodeFunctionData({
          abi: EigenpieStaking,
          functionName: 'depositAsset',
          args: [
            stETHAddr,
            estimateSTETHAmount,
            estimateMSTETHAmount,
            ReferalAccount,
          ],
        }),
        abi: EigenpieStaking as Abi,
        meta: {
          highlights: ['Eigenpie'],
        },
      })
    }
    return txs
  },
  gasSaved: 18,
  previewTx: [
    {
      name: 'Stake',
      description: `ETH to Lido`,
      to: stETHAddr,
      meta: {
        highlights: ['Lido'],
      },
    },
    {
      name: 'Approve',
      description: `stETH to Eigenpie`,
      to: stETHAddr,
      meta: {
        highlights: ['Eigenpie'],
      },
    },
    {
      name: 'Stake',
      description: `stETH to Eigenpie`,
      to: eigenpieAddr,
      meta: {
        highlights: ['Eigenpie'],
      },
    },
  ],
  setActions: (args) => {
    return [
      {
        href: 'https://www.eigenlayer.magpiexyz.io/restake',
        text: 'Manage Position (Eigenpie)',
      },
    ]
  },
}

export default [eigenpieSTETH]
