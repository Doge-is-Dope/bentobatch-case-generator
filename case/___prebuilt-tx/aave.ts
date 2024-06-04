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
import { approveERC20PreviewTx, approveERC20Tx, allowance } from './ERC20'

import AAVE_POOL_V3 from '@/models/abi/aave/POOL_V3.json'
import AAVE_WRAPPED_TOKEN_GATEWAY_V3 from '@/models/abi/aave/WRAPPED_TOKEN_GATEWAY_V3.json'
import DEBT_WETH from '@/models/abi/aave/DEBT_WETH.json'
import { wstETHAddr } from './lido'

// ETH
const aavePoolV3Addr = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'
const aaveWrappedTokenGatewayV3Addr =
  '0x893411580e590D62dDBca8a703d61Cc4A8c7b2b9'
const debtWethAddr = '0xeA51d7853EEFb32b6ee06b1C12E6dcCA88Be0fFE'

export const supplyETHPreviewTx: () => PreviewTx = () => {
  return {
    name: 'Supply',
    description: `ETH to AAVE`,
    to: aaveWrappedTokenGatewayV3Addr,
    meta: {
      highlights: ['AAVE'],
    },
  }
}

export const supplyETHTx: (params: {
  inputAmount: bigint
  onBehalfOf: `0x${string}` | undefined
}) => Tx = (params) => {
  const { inputAmount, onBehalfOf } = params

  return {
    name: `Supply`,
    description: `${formatEther(inputAmount)} ETH to AAVE as collateral`,
    to: aaveWrappedTokenGatewayV3Addr,
    value: inputAmount,
    data: encodeFunctionData({
      abi: AAVE_WRAPPED_TOKEN_GATEWAY_V3,
      functionName: 'depositETH',
      args: [
        aavePoolV3Addr, // pool
        onBehalfOf, // onBehalfOf
        0, // referralCode, is currently inactive
      ],
    }),
    abi: AAVE_WRAPPED_TOKEN_GATEWAY_V3 as Abi,
    meta: {
      highlights: ['AAVE'],
    },
  }
}

export const supplyWSTETHPreviewTx: () => PreviewTx = () => {
  return {
    name: 'Supply',
    description: `wstETH to AAVE`,
    to: aaveWrappedTokenGatewayV3Addr,
    meta: {
      highlights: ['AAVE'],
    },
  }
}

export const supplyWSTETHTx: (params: {
  inputAmount: bigint
  onBehalfOf: `0x${string}` | undefined
}) => Tx = (params) => {
  const { inputAmount, onBehalfOf } = params

  return {
    name: `Supply`,
    description: `${formatEther(inputAmount)} wstETH to AAVE as collateral`,
    to: aavePoolV3Addr,
    value: 0n,
    data: encodeFunctionData({
      abi: AAVE_POOL_V3,
      functionName: 'supply',
      args: [
        wstETHAddr, // token
        inputAmount, // pool
        onBehalfOf, // onBehalfOf
        0, // referralCode, is currently inactive
      ],
    }),
    abi: AAVE_POOL_V3 as Abi,
    meta: {
      highlights: ['AAVE'],
    },
  }
}

export const apporveWSTETHToAAVEPreviewTx: () => PreviewTx = () => {
  return approveERC20PreviewTx({
    tokenAddress: wstETHAddr,
    tokenSymbol: 'wstETH',
    spenderName: 'AAVE',
  })
}

export const apporveWSTETHToAAVETx: (params: { inputAmount: bigint }) => Tx = (
  params
) => {
  const { inputAmount } = params

  return approveERC20Tx({
    tokenAddress: wstETHAddr,
    tokenSymbol: 'wstETH',
    tokenDecimals: 18,
    spenderAddress: aavePoolV3Addr,
    spenderName: 'AAVE',
    amount: inputAmount,
  })
}

export const checkOrApporveWSTETHToAAVETx: (params: {
  chain: Chain
  userAddress: `0x${string}` | undefined
  inputAmount: bigint
}) => Promise<Tx | null> = async (params) => {
  const { chain, userAddress, inputAmount } = params

  // check allowance
  const allowanceAmount = await allowance({
    chain: chain,
    userAddress: userAddress!,
    tokenAddress: wstETHAddr,
    spenderAddress: aavePoolV3Addr,
  })

  if (allowanceAmount < inputAmount) {
    return approveERC20Tx({
      tokenAddress: wstETHAddr,
      tokenSymbol: 'wstETH',
      tokenDecimals: 18,
      spenderAddress: aavePoolV3Addr,
      spenderName: 'AAVE',
      amount: inputAmount,
    })
  }
  return null
}
export const checkEmode: (params: {
  chain: Chain
  userAddress: `0x${string}` | undefined
}) => Promise<boolean> = async (params) => {
  const { chain, userAddress } = params
  const client = createPublicClient({
    chain: chain,
    transport: http(),
  })

  const aavePoolV3 = getContract({
    address: aavePoolV3Addr,
    abi: AAVE_POOL_V3,
    client: client,
  })

  return (await aavePoolV3.read.getUserEMode([userAddress])) == 1n
}

export const enableEModePreviewTx: () => PreviewTx = () => {
  return {
    name: 'Enable',
    description: `AAVE E-Mode if it is disabled`,
    to: aavePoolV3Addr,
    meta: {
      highlights: ['AAVE'],
    },
  }
}

export const enableEModeTx: () => Tx = () => {
  return {
    name: `Enable`,
    description: `AAVE E-Mode`,
    to: aavePoolV3Addr,
    value: 0n,
    data: encodeFunctionData({
      abi: AAVE_POOL_V3,
      functionName: 'setUserEMode',
      args: [
        1, // categoryId
      ],
    }),
    abi: AAVE_POOL_V3 as Abi,
    meta: {
      highlights: ['AAVE'],
    },
  }
}

// let borrow getting ETH not WETH
export const delegatePreviewTx: () => PreviewTx = () => {
  return {
    name: 'Delegate',
    description: `borrowing power on the debt WETH if needed`,
    to: debtWethAddr,
    meta: {
      highlights: ['AAVE'],
    },
  }
}

export const delegateTx: (params: { inputAmount: bigint }) => Tx = (params) => {
  return {
    name: `Delegate`,
    description: `borrowing power on the debt WETH`,
    to: debtWethAddr,
    value: 0n,
    data: encodeFunctionData({
      abi: DEBT_WETH,
      functionName: 'approveDelegation',
      args: [
        aaveWrappedTokenGatewayV3Addr, // delegatee
        params.inputAmount, // amount
      ],
    }),
    abi: DEBT_WETH as Abi,
  }
}

export const borrowETHPreviewTx: () => PreviewTx = () => {
  return {
    name: 'Borrow',
    description: `ETH from AAVE`,
    to: aaveWrappedTokenGatewayV3Addr,
    meta: {
      highlights: ['AAVE'],
    },
  }
}

export const borrowETHTx: (params: { inputAmount: bigint }) => Tx = (
  params
) => {
  return {
    name: `Borrow`,
    description: `${formatEther(params.inputAmount)} ETH from AAVE`,
    to: aaveWrappedTokenGatewayV3Addr,
    value: 0n,
    data: encodeFunctionData({
      abi: AAVE_WRAPPED_TOKEN_GATEWAY_V3,
      functionName: 'borrowETH',
      args: [
        aavePoolV3Addr, // delegatee
        params.inputAmount, // amount
        2, // interestRateMode
        0, // referralCode, is currently inactive
      ],
    }),
    abi: AAVE_WRAPPED_TOKEN_GATEWAY_V3 as Abi,
    meta: {
      highlights: ['AAVE'],
    },
  }
}
