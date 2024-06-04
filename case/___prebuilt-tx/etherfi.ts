import type { Abi } from 'abitype'
import { PreviewTx, Tx } from '@/models/cases/v3/types'
import {
  createPublicClient,
  getContract,
  encodeFunctionData,
  http,
  formatEther,
  formatUnits,
  Chain,
} from 'viem'
import { approveERC20PreviewTx, approveERC20Tx } from './ERC20'

import EETHLiquidityPool from '@/models/abi/EETHLiquidityPool.json'
import WeETH from '@/models/abi/WEETH.json'
import EtherfiLiquidVaultV1 from '@/models/abi/EtherfiLiquidVaultV1.json'

const eethLiqPoolAddr = '0x308861A430be4cce5502d0A12724771Fc6DaF216'
const eETHAddr = '0x35fA164735182de50811E8e2E824cFb9B6118ac2'
const weETHAddr = '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee'
// ether.fi liquid vault v1
const etherFiLiqVaultV1 = '0xeA1A6307D9b18F8d1cbf1c3Dd6aad8416C06a221'

export const stakeToEtherFiPreviewTx: () => PreviewTx = () => {
  return {
    name: 'Stake',
    description: `ETH to ether.fi`,
    to: eethLiqPoolAddr,
    meta: {
      highlights: ['ether.fi'],
    },
  }
}

export const stakeToEtherFiTx: (params: { inputAmount: bigint }) => Tx = (
  params
) => {
  const { inputAmount } = params

  return {
    name: 'Stake',
    description: `${formatEther(inputAmount)} ETH to ether.fi`,
    to: eethLiqPoolAddr,
    value: inputAmount,
    data: encodeFunctionData({
      abi: EETHLiquidityPool,
      functionName: 'deposit',
    }),
    abi: EETHLiquidityPool as Abi,
    meta: {
      highlights: ['ether.fi'],
    },
  }
}

export const wrapEETHToWEETHPreviewTx: () => PreviewTx = () => {
  return {
    name: 'Wrap',
    description: `eETH to weETH`,
    to: eethLiqPoolAddr,
    meta: {
      highlights: ['weETH'],
    },
  }
}

export const wrapEETHToWEETHTx: (params: {
  chain: Chain
  inputAmount: bigint
}) => Promise<Tx> = async (params) => {
  const { inputAmount, chain } = params

  const client = createPublicClient({
    chain: chain,
    transport: http(),
  })

  const eethLiqPool = getContract({
    address: eethLiqPoolAddr,
    abi: EETHLiquidityPool,
    client: client,
  })

  const { result: weETHAmount } = await eethLiqPool.simulate.deposit([], {
    value: inputAmount,
  })

  const eETHAmount = (await eethLiqPool.read.amountForShare([
    weETHAmount,
  ])) as bigint

  return {
    name: 'Wrap',
    description: `${formatUnits(eETHAmount, 18)} eETH into weETH`,
    to: weETHAddr,
    value: 0n,
    data: encodeFunctionData({
      abi: WeETH,
      functionName: 'wrap',
      args: [
        eETHAmount, // assets
      ],
    }),
    abi: WeETH as Abi,
  }
}

export const stakeToEtherFiGetWEETHPreviewTxs: () => PreviewTx[] = () => {
  return [
    stakeToEtherFiPreviewTx(),
    approveERC20PreviewTx({
      tokenAddress: eETHAddr,
      tokenSymbol: 'eETH',
      spenderName: 'weETH',
    }),
    wrapEETHToWEETHPreviewTx(),
  ]
}

export const stakeToEtherFiGetWEETHTxs: (params: {
  chain: Chain
  inputAmount: bigint
}) => Promise<Tx[]> = async (params) => {
  const { chain, inputAmount } = params

  const txs: Tx[] = []
  // stake
  txs.push(stakeToEtherFiTx({ inputAmount }))
  // approve eETH
  txs.push(
    approveERC20Tx({
      tokenAddress: eETHAddr,
      tokenSymbol: 'eETH',
      tokenDecimals: 18,
      spenderAddress: weETHAddr,
      spenderName: 'weETH',
      amount: inputAmount,
    })
  )
  // wrap eETH to weETH
  txs.push(await wrapEETHToWEETHTx({ chain, inputAmount }))

  return txs
}

export const estimateWEETHAmount: (params: {
  chain: Chain
  inputAmount: bigint
}) => Promise<bigint> = async (params) => {
  const { inputAmount, chain } = params

  const client = createPublicClient({
    chain: chain,
    transport: http(),
  })

  const eethLiqPool = getContract({
    address: eethLiqPoolAddr,
    abi: EETHLiquidityPool,
    client: client,
  })

  const { result: weETHAmount }: { result: bigint } =
    await eethLiqPool.simulate.deposit([], {
      value: inputAmount,
    })
  return weETHAmount - BigInt(1)
}

export const approveAndDepositWEETHToEtherFiVaultPreviewTx: () => PreviewTx[] =
  () => {
    return [
      approveERC20PreviewTx({
        tokenAddress: weETHAddr,
        tokenSymbol: 'weETH',
        spenderName: 'EtherFi Liquid Vault v1',
      }),
      {
        name: 'Deposit',
        description: `weETH to Ether Fi Liquid Vault v1`,
        to: etherFiLiqVaultV1,
        meta: {
          highlights: ['Ether Fi Liquid Vault v1'],
        },
      },
    ]
  }

export const approveAndDepositWEETHToEtherFiVaultTx: (params: {
  inputAmount: bigint
  receiver: `0x${string}` | undefined
}) => Tx[] = (params) => {
  const { inputAmount, receiver } = params

  const txs: Tx[] = []
  // approve eETH
  txs.push(
    approveERC20Tx({
      tokenAddress: weETHAddr,
      tokenSymbol: 'weETH',
      tokenDecimals: 18,
      spenderAddress: etherFiLiqVaultV1,
      spenderName: 'Ether Fi Liquid Vault v1',
      amount: inputAmount,
    })
  )
  // deposit weETH to Ether Fi Liquid Vault v1
  txs.push({
    name: 'Deposit',
    description: `${formatUnits(inputAmount, 18)} weETH into Ether Fi Liquid Vault v1`,
    to: etherFiLiqVaultV1,
    value: 0n,
    data: encodeFunctionData({
      abi: EtherfiLiquidVaultV1,
      functionName: 'multiAssetDeposit',
      args: [
        weETHAddr, // depositAsset
        inputAmount, // assets
        receiver,
      ],
    }),
    abi: EtherfiLiquidVaultV1 as Abi,
  })

  return txs
}

export const getWEETHPreviewTxs = stakeToEtherFiGetWEETHPreviewTxs
export const getWEETHTxs = stakeToEtherFiGetWEETHTxs
