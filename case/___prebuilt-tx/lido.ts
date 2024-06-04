import type { Abi } from 'abitype'
import { PreviewTx, Tx } from '@/models/cases/v3/types'
import {
  createPublicClient,
  getContract,
  encodeFunctionData,
  http,
  formatEther,
  Chain,
} from 'viem'
import { ReferalAccount } from '@/cases/constants'
import { approveERC20PreviewTx, approveERC20Tx, allowance } from './ERC20'
import Lido from '@/models/abi/Lido.json'
import WSTETH from '@/models/abi/WSTETH.json'

const STETHLiqPoolAddr = '0x308861A430be4cce5502d0A12724771Fc6DaF216'
export const stETHAddr = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' //Lido: stETH
export const wstETHAddr = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0' // Lido: wstETH

export const stakeToLidoPreviewTx: () => PreviewTx = () => {
  return {
    name: 'Stake',
    description: `ETH to Lido`,
    to: STETHLiqPoolAddr,
    meta: {
      highlights: ['Lido'],
    },
  }
}

export const stakeToLidoTx: (params: { inputAmount: bigint }) => Tx = (
  params
) => {
  const { inputAmount } = params

  return {
    name: 'Stake',
    description: `${formatEther(inputAmount)} ETH to Lido`,
    to: stETHAddr,
    value: inputAmount,
    data: encodeFunctionData({
      abi: Lido,
      functionName: 'submit',
      args: [ReferalAccount],
    }),
    abi: Lido as Abi,
    meta: {
      highlights: ['Lido'],
    },
  }
}

export const apporveSTETHToWSTETHPreviewTx: () => PreviewTx = () => {
  return approveERC20PreviewTx({
    tokenAddress: stETHAddr,
    tokenSymbol: 'stETH',
    spenderName: 'wstETH',
  })
}

export const apporveSTETHToWSTETHTx: (params: { inputAmount: bigint }) => Tx = (
  params
) => {
  const { inputAmount } = params

  return approveERC20Tx({
    tokenAddress: stETHAddr,
    tokenSymbol: 'stETH',
    tokenDecimals: 18,
    spenderAddress: wstETHAddr,
    spenderName: 'wstETH',
    amount: inputAmount,
  })
}

export const checkOrApporveSTETHToWSTETHTx: (params: {
  chain: Chain
  userAddress: `0x${string}` | undefined
  inputAmount: bigint
}) => Promise<Tx | null> = async (params) => {
  const { chain, userAddress, inputAmount } = params

  // check allowance
  const allowanceAmount = await allowance({
    chain: chain,
    userAddress: userAddress!,
    tokenAddress: stETHAddr,
    spenderAddress: wstETHAddr,
  })

  if (allowanceAmount < inputAmount) {
    return approveERC20Tx({
      tokenAddress: stETHAddr,
      tokenSymbol: 'stETH',
      tokenDecimals: 18,
      spenderAddress: wstETHAddr,
      spenderName: 'wstETH',
      amount: inputAmount,
    })
  }
  return null
}

export const wrapSTETHToWSTETHPreviewTx: () => PreviewTx = () => {
  return {
    name: 'Wrap',
    description: `stETH to wstETH`,
    to: STETHLiqPoolAddr,
    meta: {
      highlights: ['wstETH'],
    },
  }
}

export const wrapSTETHToWSTETHTx: (params: {
  chain: Chain
  inputAmount: bigint
}) => Tx = (params) => {
  const { inputAmount, chain } = params

  return {
    name: 'Wrap',
    description: `${formatEther(inputAmount)} stETH into wstETH`,
    to: wstETHAddr,
    value: 0n,
    data: encodeFunctionData({
      abi: WSTETH,
      functionName: 'wrap',
      args: [
        inputAmount, // assets
      ],
    }),
    abi: WSTETH as Abi,
  }
}

export const stakeToLidoGetWSTETHPreviewTxs: () => PreviewTx[] = () => {
  return [
    stakeToLidoPreviewTx(),
    apporveSTETHToWSTETHPreviewTx(),
    wrapSTETHToWSTETHPreviewTx(),
  ]
}

export const stakeToLidoGetWSTETHTxs: (params: {
  chain: Chain
  inputAmount: bigint
}) => Promise<Tx[]> = async (params) => {
  const { chain, inputAmount } = params

  const txs: Tx[] = []
  // stake
  txs.push(stakeToLidoTx({ inputAmount }))
  // approve STETH
  txs.push(apporveSTETHToWSTETHTx({ inputAmount }))
  // wrap STETH to wSTETH
  txs.push(await wrapSTETHToWSTETHTx({ chain, inputAmount }))

  return txs
}

export const estimateWSTETHAmount: (params: {
  chain: Chain
  inputAmount: bigint
}) => Promise<bigint> = async (params) => {
  const { inputAmount, chain } = params

  const client = createPublicClient({
    chain: chain,
    transport: http(),
  })

  const wstETH = getContract({
    address: wstETHAddr,
    abi: WSTETH,
    client: client,
  })

  const { result: estimateWSTETHAmount }: { result: bigint } =
    await wstETH.simulate.getWstETHByStETH([inputAmount])

  return estimateWSTETHAmount - BigInt(1)
}

export const getWSTETHPreviewTxs = stakeToLidoGetWSTETHPreviewTxs
export const getWSTETHTxs = stakeToLidoGetWSTETHTxs
