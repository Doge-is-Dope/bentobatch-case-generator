import type { Abi } from 'abitype'
import {
  Context,
  BatchCase,
  InputType,
  Tx,
  TagTitle,
  WalletType,
} from '@/models/cases/v3/types'
import { balance, decimalValidator, max } from '@/models/cases/v3/utils'
import {
  createPublicClient,
  getContract,
  encodeFunctionData,
  parseUnits,
  http,
  formatEther,
} from 'viem'

import StaderStakePoolsManager from './abi/StaderStakePoolsManager.json'
import ETHx from './abi/ETHx.json'
import LRTDepositPool from './abi/LRTDepositPool.json'
import RSETH from './abi/rsETH.json'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'
import { ReferalAccount } from '../constants'
import {
  addLiquiditySingleTokenData,
  getMarketAddr,
} from '../prebuilt-tx/pendle'
import { mainnet } from 'viem/chains'
import { AddressNotFoundError } from '../error'

const staderStakingPoolManagerAddr =
  '0xcf5EA1b38380f6aF39068375516Daf40Ed70D299'
const ethxAddr = '0xA35b1B31Ce002FBF2058D22F30f95D405200A15b'
const lrtDepositPoolAddr = '0x036676389e48133B63a802f8635AD39E752D375D'
const rsETHAddr = '0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7'
const rsETHSYAddr = '0x730a5e2acebccaa5e9095723b3cb862739da793c'

const tags = [{ title: TagTitle.Defi }, { title: TagTitle.Restaking }]

const kelpAndPendle: BatchCase = {
  id: 'kelp_and_pendle',
  name: 'ETH restaking on @KelpDAO and farm on Pendle',
  description:
    'Stake ETH to KelpDAO to Earn Kelp Miles and EigenLayer Points and Farm on Pendle',
  details: BATCH_DETAILS,
  website: {
    title: 'KelpDAO',
    url: 'https://kelpdao.xyz/',
  },
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  tags,
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  networkId: mainnet.id,
  atomic: true,
  renderExpiry: undefined,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'ETH Amount',
      inputType: InputType.NativeAmount,
      description: 'Amount to stake and farm (leave ~0.001 ETH for gas fee)',
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
    const inputAmount = parseUnits(inputs[0], 18)

    const kelpReferralId =
      '0xa9857dbaa6f99e5a557b23d321843a48c5a5417029894f76db4c80bddab116bc'

    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    })

    const userAddress = context.account.address
    if (!userAddress) throw new AddressNotFoundError()

    let txs: Tx[] = []

    const staderStakingPoolManager = getContract({
      address: staderStakingPoolManagerAddr,
      abi: StaderStakePoolsManager,
      client: client,
    })

    const { result: ethxAmount } =
      await staderStakingPoolManager.simulate.deposit([userAddress], {
        value: inputAmount,
      })

    // stake ETH for ETHx
    txs.push({
      name: 'Stake',
      description: `${formatEther(inputAmount)} ETH for ${formatEther(ethxAmount)} ETHx on Stader`,
      to: staderStakingPoolManagerAddr,
      value: inputAmount,
      data: encodeFunctionData({
        abi: StaderStakePoolsManager,
        functionName: 'deposit',
        args: [
          userAddress, // _receiver
        ],
      }),
      abi: StaderStakePoolsManager as Abi,
      meta: {
        highlights: ['Stader'],
      },
    })

    // aprove ETHx transfer
    txs.push({
      name: 'Approve',
      description: `${formatEther(ethxAmount)} ETHx to Kelp`,
      to: ethxAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: ETHx,
        functionName: 'approve',
        args: [
          lrtDepositPoolAddr, // spender
          ethxAmount, // amount
        ],
      }),
      abi: ETHx as Abi,
      meta: {
        highlights: ['Kelp'],
      },
    })

    const lrtDepositPool = getContract({
      address: lrtDepositPoolAddr,
      abi: LRTDepositPool,
      client: client,
    })
    const ethxAmountToDeposit = (ethxAmount * BigInt(998)) / BigInt(1000)

    const { result: rsETHAmount } =
      await lrtDepositPool.simulate.getRsETHAmountToMint(
        [ethxAddr, ethxAmountToDeposit],
        {
          value: 0n,
        }
      )

    // deposit ETHx for rsETH
    txs.push({
      name: 'Deposit',
      description: `${formatEther(ethxAmountToDeposit)} ETHx for ${formatEther(rsETHAmount)} rsETH on Kelp`,
      to: lrtDepositPoolAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: LRTDepositPool,
        functionName: 'depositAsset',
        args: [
          ethxAddr, // asset
          ethxAmountToDeposit, // despositAmount
          0n, // minRSETHAmountExpected
          kelpReferralId, // referralId
        ],
      }),
      abi: LRTDepositPool as Abi,
      meta: {
        highlights: ['Kelp'],
      },
    })

    const pendleRSETHMarketAddr = await getMarketAddr({
      chainId: context.chain.id.toString(),
      syTokenAddr: rsETHSYAddr,
    })

    // farming on Pendle
    const rsETHAmountToDeposit = (rsETHAmount * BigInt(998)) / BigInt(1000)

    const pendleTxInfo = await addLiquiditySingleTokenData(
      {
        chain: context.chain,
        receiverAddr: userAddress,
        marketAddr: pendleRSETHMarketAddr,
        tokenInAddr: rsETHAddr,
        amountTokenIn: rsETHAmountToDeposit,
        slippage: 0.002,
      },
      { tokenInName: 'rsETH' }
    )

    // approve rsETH
    txs.push({
      name: 'Approve',
      description: `${formatEther(rsETHAmount)} rsETH to Pendle`,
      to: rsETHAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: RSETH,
        functionName: 'approve',
        args: [
          pendleTxInfo.routerAddress, // spender is the pendle router
          rsETHAmount, // amount
        ],
      }),
      abi: RSETH as Abi,
      meta: {
        highlights: ['Pendle'],
      },
    })

    txs.push(pendleTxInfo.tx)

    return txs
  },
  previewTx: [
    {
      name: 'Stake',
      description: 'ETH for ETHx on Stader',
      to: staderStakingPoolManagerAddr,
      meta: {
        highlights: ['Stader'],
      },
    },
    {
      name: 'Approve',
      description: 'ETHx to Kelp',
      to: ethxAddr,
      meta: {
        highlights: ['Kelp'],
      },
    },
    {
      name: 'Deposit',
      description: 'ETHx for rsETH on Kelp',
      to: lrtDepositPoolAddr,
      meta: {
        highlights: ['Kelp'],
      },
    },
    {
      name: 'Approve',
      description: 'rsETH to Pendle',
      to: rsETHAddr,
      meta: {
        highlights: ['Pendle'],
      },
    },
    {
      name: 'Provide',
      description: 'Liquidity to PT/SY pool on Pendle',
      to: '0x4f43c77872Db6BA177c270986CD30c3381AF37Ee', // might expire, but use a fixed value for now
      meta: {
        highlights: ['Pendle'],
      },
    },
  ],
  setActions: () => {
    return [
      {
        href: `https://kelpdao.xyz/dashboard/?utm_source=${ReferalAccount}`,
        text: 'Kelp Grand Miles',
      },
      {
        href: `https://kelpdao.xyz/claim-kep/?utm_source=${ReferalAccount}`,
        text: 'Claim $KEP',
      },
      {
        href: 'https://app.pendle.finance/earn/liquidity?showDetails=true',
        text: 'Review Assets (Pendle)',
      },
    ]
  },
}

export default [kelpAndPendle]
