import type { Abi } from 'abitype'
import {
  Context,
  BatchCase,
  InputType,
  Tag,
  Tx,
  WalletType,
} from '@/models/cases/v3/types'
import { balance, decimalValidator, max } from '@/models/cases/v3/utils'
import {
  getContract,
  formatEther,
  createPublicClient,
  encodeFunctionData,
  parseUnits,
  http,
} from 'viem'
import swell from './abi/swell.json'
import eigenpie from './abi/eigenpie.json'
import mswETH from './abi/mswETH.json'
import zircuit from './abi/zircuit.json'
import { ReferalAccount } from '../constants'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './details'

// Addresses
const swETHProxyAddr = '0xf951E335afb289353dc249e82926178EaC7DEd78' // swell network: swETH
const eigenpieRestakingProxyAddr = '0x24db6717dB1C75B9Db6eA47164D8730B63875dB7' // eigenpie
const mswETHProxyAddr = '0x32bd822d615A3658A68b6fDD30c2fcb2C996D678' // mswETH
const zircuitRestakingAddr = '0xF047ab4c75cebf0eB9ed34Ae2c186f3611aEAfa6' // zircuit

const zircuitEigenpieSwell: BatchCase = {
  id: 'zircuit_eigenpie_swell',
  name: 'Restake with Eigenpie & Swell & Zircuit',
  description: '',
  details: BATCH_DETAILS,
  website: {
    title: 'Zircuit',
    url: 'https://www.zircuit.com/',
  },
  tags: [
    'Official x Collab',
    'Extra Benefits!!!',
    'DeFi',
    'LRT',
    'ETH',
    'Restaking',
    'Pearls',
    'Zircuit Points',
  ].map((name) => ({ title: name }) as Tag),
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
      description: 'Amount to deposit',
      validate: decimalValidator(18, parseUnits('0.002', 18)),
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
    const txs: Tx[] = []
    const ethInputAmount = parseUnits(inputs[0], 18)
    const eth = 10n ** 18n

    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    })

    const swellStaking = getContract({
      address: swETHProxyAddr,
      abi: swell,
      client: client,
    })

    const eigenpieRestaking = getContract({
      address: eigenpieRestakingProxyAddr,
      abi: eigenpie,
      client: client,
    })

    const mswETHToken = getContract({
      address: mswETHProxyAddr,
      abi: mswETH,
      client: client,
    })

    const zircuitRestaking = getContract({
      address: zircuitRestakingAddr,
      abi: zircuit,
      client: client,
    })

    const { result: ethToSwETHRate }: { result: bigint } =
      await swellStaking.simulate.ethToSwETHRate()
    const expectedSwETHAmount = (ethInputAmount * ethToSwETHRate) / eth

    // 1. Stake ETH with Swell with referer code
    txs.push({
      name: 'Stake',
      description: `${formatEther(
        ethInputAmount
      )} ETH and receive ${formatEther(expectedSwETHAmount)} swETH on Swell`,
      to: swellStaking.address,
      value: ethInputAmount,
      data: encodeFunctionData({
        abi: swellStaking.abi,
        functionName: 'depositWithReferral',
        args: [ReferalAccount],
      }),
      abi: swellStaking.abi as Abi,
      meta: {
        highlights: ['Swell'],
      },
    })

    // 2. Approve Swell to be restake to Eigenlayer on Eigenpie to earn Pearls
    const swETHDepositAmount = expectedSwETHAmount
    const { result: swETHDepositAllowance } =
      await swellStaking.simulate.allowance([
        context.account.address,
        eigenpieRestaking.address,
      ])
    if (swETHDepositAllowance < swETHDepositAmount) {
      txs.push({
        name: 'Approve',
        description: `${formatEther(
          swETHDepositAmount
        )} swETH to be restake to Eigenlayer on Eigenpie to earn Pearls`,
        to: swellStaking.address,
        value: 0n,
        data: encodeFunctionData({
          abi: swellStaking.abi,
          functionName: 'approve',
          args: [
            eigenpieRestaking.address, // spender
            swETHDepositAmount, // amount
          ],
        }),
        abi: swellStaking.abi as Abi,
        meta: {
          highlights: ['Eigenpie', 'Pearls'],
        },
      })
    }

    // 3. Stake swETH with Eigenpie
    // swETH:mswETH should be 1:1
    const mswETHAmount = swETHDepositAmount
    txs.push({
      name: 'Restake',
      description: `${formatEther(
        swETHDepositAmount
      )} swETH and receive ${formatEther(mswETHAmount)} mswETH on Eigenpie`,
      to: eigenpieRestaking.address,
      value: 0n,
      data: encodeFunctionData({
        abi: eigenpieRestaking.abi,
        functionName: 'depositAsset',
        args: [
          swETHProxyAddr, // asset
          swETHDepositAmount, // depositAmount
          mswETHAmount, // minRec
          ReferalAccount, // referral
        ],
      }),
      abi: eigenpieRestaking.abi as Abi,
      meta: {
        highlights: ['Eigenpie'],
      },
    })

    const { result: isPreDeposit }: { result: boolean } =
      await eigenpieRestaking.simulate.isPreDeposit()
    const minAmountToDeposit =
      (await eigenpieRestaking.read.minAmountToDeposit()) as bigint
    if (mswETHAmount < minAmountToDeposit)
      throw new Error(
        `mswETHAmount is insufficient, the minimum amount of mswETHAmount is ${formatEther(minAmountToDeposit)}`
      )
    if (isPreDeposit) {
      throw new Error(
        'Eigenpie is in pre-deposit mode. Please try again later.'
      )
    } else {
      // 4. Approve mswETH to be restake to Zircuit to earn points
      const { result: mswETHDepositAllowance } =
        await mswETHToken.simulate.allowance([
          context.account.address,
          zircuitRestaking.address,
        ])
      if (mswETHDepositAllowance < mswETHAmount) {
        txs.push({
          name: 'Approve',
          description: `${formatEther(
            mswETHAmount
          )} mswETH to be restaked on Zircuit to earn Zircuit Points`,
          to: mswETHToken.address,
          value: 0n,
          data: encodeFunctionData({
            abi: mswETHToken.abi,
            functionName: 'approve',
            args: [zircuitRestaking.address, mswETHAmount],
          }),
          abi: mswETHToken.abi as Abi,
          meta: {
            highlights: ['Zircuit', 'Points'],
          },
        })
      }

      // 5. Restake mswETH with Zircuit
      txs.push({
        name: 'Restake',
        description: `${formatEther(
          mswETHAmount
        )} mswETH to Zircuit to earn Zircuit Points`,
        to: zircuitRestaking.address,
        value: 0n,
        data: encodeFunctionData({
          abi: zircuitRestaking.abi,
          functionName: 'depositFor',
          args: [mswETHProxyAddr, context.account.address, mswETHAmount],
        }),
        abi: zircuitRestaking.abi as Abi,
        meta: {
          highlights: ['Zircuit', 'Points'],
        },
      })
    }

    return txs
  },
  previewTx: [
    {
      name: 'Stake',
      description: `ETH and receive swETH on Swell`,
      to: swETHProxyAddr,
      meta: {
        highlights: ['Swell'],
      },
    },
    {
      name: 'Approve',
      description: `swETH to be restake to Eigenlayer on Eigenpie to earn Pearls`,
      to: swETHProxyAddr,
      meta: {
        highlights: ['Eigenpie', 'Pearls'],
      },
    },
    {
      name: 'Restake',
      description: `swETH for mswETH on Eigenpie`,
      to: eigenpieRestakingProxyAddr,
      meta: {
        highlights: ['Eigenpie'],
      },
    },
    {
      name: 'Approve',
      description: `mswETH to be restaked on Zircuit to earn Zircuit Points`,
      to: mswETHProxyAddr,
      meta: {
        highlights: ['Zircuit', 'Points'],
      },
    },
    {
      name: 'Restake',
      description: `mswETH to Zircuit to earn Zircuit Points`,
      to: zircuitRestakingAddr,
      meta: {
        highlights: ['Zircuit', 'Points'],
      },
    },
  ],
  setActions: () => {
    return [
      {
        href: 'https://stake.zircuit.com/?ref=BENTOZ',
        text: 'Check Points (Zircuit)',
      },
      {
        href: 'https://www.eigenlayer.magpiexyz.io/restake',
        text: 'Check Points (Eigenpie)',
      },
      {
        href: 'https://app.swellnetwork.io/portfolio',
        text: 'Check Assets (Swell)',
      },
    ]
  },
}

export default [zircuitEigenpieSwell]
