import type { Address } from 'abitype'
import {
  Chain,
  createPublicClient,
  getContract,
  encodeFunctionData,
  formatUnits,
  http,
  erc20Abi,
} from 'viem'
import { PreviewTx, Tx } from '@/models/cases/v3/types'

export const approveERC20PreviewTx: (params: {
  tokenAddress: Address
  tokenSymbol: string
  spenderName: string
}) => PreviewTx = (params) => {
  const { tokenAddress, tokenSymbol, spenderName } = params
  return {
    name: 'Approve',
    description: `${spenderName} to access ${tokenSymbol}`,
    to: tokenAddress,
    meta: {
      highlights: [spenderName],
    },
  }
}

/**
 * Use this method to check whether the allowance is already enough. If so, we return undefine which means we don't need to add a approve tx.
 * @returns Promise of Tx or undefined
 */
export const approveERC20TxIfNeeded: (params: {
  chain: Chain
  userAddress: Address
  tokenAddress: Address
  tokenSymbol: string
  tokenDecimals: number
  spenderAddress: Address
  spenderName: string
  amount: bigint
}) => Promise<Tx | undefined> = async (params) => {
  const tokenAllowance = await allowance(params)
  if (tokenAllowance < params.amount) {
    return approveERC20Tx(params)
  }
  return undefined
}

export const approveERC20Tx: (params: {
  tokenAddress: Address
  tokenSymbol: string
  tokenDecimals: number
  spenderAddress: Address
  spenderName: string
  amount: bigint
}) => Tx = (params) => {
  const {
    tokenAddress,
    tokenSymbol,
    tokenDecimals,
    spenderAddress,
    spenderName,
    amount,
  } = params
  return {
    name: 'Approve',
    description: `${spenderName} to access ${formatUnits(amount, tokenDecimals)} ${tokenSymbol}`,
    to: tokenAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [spenderAddress, amount],
    }),
    abi: erc20Abi,
    meta: {
      highlights: [spenderName],
    },
  }
}

export const transferPreviewTx = ({
  receiver,
  tokenSymbol,
  tokenAddress,
}:{
  receiver: Address
  tokenSymbol: string
  tokenAddress: Address
}): PreviewTx => {
  return {
    name: 'Transfer',
    description: `${tokenSymbol} to ${receiver}`,
    to: tokenAddress,
    meta: {
      highlights: [tokenSymbol],
    },
  }
}

export const transferTx: (params: {
  userAddress: Address
  receiver: Address
  tokenSymbol: string
  tokenAddress: Address
  tokenAmount: bigint
  tokenDecimals: number
}) => Tx = (params) => {
  return {
    name: 'Transfer',
    description: `${formatUnits(params.tokenAmount, params.tokenDecimals)} ${params.tokenSymbol} to ${params.receiver}`,
    to: params.tokenAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [
        params.receiver,
        params.tokenAmount
      ],
    }),
    abi: erc20Abi,
    meta: {
      highlights: [params.tokenSymbol],
    },
  }
}

export const allowance: (params: {
  chain: Chain
  userAddress: Address
  tokenAddress: Address
  spenderAddress: Address
}) => Promise<bigint> = async (params) => {
  const { chain, userAddress, tokenAddress, spenderAddress } = params
  const client = createPublicClient({
    chain: chain,
    transport: http(),
  })
  const contract = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: client,
  })
  return (await contract.read.allowance([
    userAddress,
    spenderAddress,
  ])) as bigint
}

export const balanceOf: (params: {
  chain: Chain
  userAddress: Address
  tokenAddress: Address
}) => Promise<bigint> = async (params) => {
  const { chain, userAddress, tokenAddress } = params
  const client = createPublicClient({
    chain: chain,
    transport: http(),
  })
  const contract = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: client,
  })
  return (await contract.read.balanceOf([userAddress])) as bigint
}
