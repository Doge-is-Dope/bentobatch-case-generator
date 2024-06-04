import type { Abi } from 'abitype'
import { Meta, Tx } from '@/models/cases/v3/types'
import {
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  formatEther,
  formatUnits,
  getContract,
  PublicClient,
} from 'viem'
import { CrocEnv, CrocSwapPlan } from '@crocswap-libs/sdk'
import AmbientSwap from './abi/AmbientSwap.json'
import WrappedEther from './abi/WrappedEther.json'
import CogPair from './abi/CogPair.json'
import { BigNumber } from 'ethers'

const scrollChainID = 0x82750

// NOTE: following address only for Scroll chain
const ethAddress = '0x0000000000000000000000000000000000000000'
const usdcAddress = '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4'
const daiAddress = '0xcA77eB3fEFe3725Dc33bccB54eDEFc3D9f764f97'
const wETHAddress = '0x5300000000000000000000000000000000000004'
const ambientSwapAddress = '0xaaaaaaaacb71bf2c8cae522ea5fa455571a74106'
// cog finnace lend address
const cogPairUSDCWETH = '0x63fdafa50c09c49f594f47ea7194b721291ec50f'
const cogPairDAIWETH = '0x43187A6052A4BF10912CDe2c2f94953e39FcE8c7'

const slippageTolerancePercentage = 1.5 // 1.5%
const slippageTolerance = slippageTolerancePercentage / 100

export const approveUSDCToAmbient: (amount: bigint) => Tx = (amount) =>
  approveERC20({
    tokenAddress: usdcAddress,
    spenderAddress: ambientSwapAddress,
    amount: amount,
    name: 'Approve',
    description: `${formatUnits(amount, 6)} USDC to Ambient`,
    meta: {
      highlights: ['Ambient'],
    },
  })

export const approveWETHToCogPairUSDCWETH: (amount: bigint) => Tx = (amount) =>
  approveERC20({
    tokenAddress: wETHAddress,
    spenderAddress: cogPairUSDCWETH,
    amount: amount,
    name: 'Approve',
    description: `${formatEther(amount)} WETH to Cog Finance`,
    meta: {
      highlights: ['Cog Finance'],
    },
  })

export const approveUSDCToCogPairUSDCWETH: (amount: bigint) => Tx = (amount) =>
  approveERC20({
    tokenAddress: usdcAddress,
    spenderAddress: cogPairUSDCWETH,
    amount: amount,
    name: 'Approve',
    description: `${formatUnits(amount, 6)} USDC to Cog Finance`,
    meta: {
      highlights: ['Cog Finance'],
    },
  })

export const approveDAIToCogPairDAIWETH: (amount: bigint) => Tx = (amount) =>
  approveERC20({
    tokenAddress: daiAddress,
    spenderAddress: cogPairDAIWETH,
    amount: amount,
    name: 'Approve',
    description: `${formatUnits(amount, 18)} DAI to Cog Finance`,
    meta: {
      highlights: ['Cog Finance'],
    },
  })

export const approveWETHToCogPairDAIWETH: (amount: bigint) => Tx = (amount) =>
  approveERC20({
    tokenAddress: wETHAddress,
    spenderAddress: cogPairDAIWETH,
    amount: amount,
    name: 'Approve',
    description: `${formatEther(amount)} WETH to Cog Finance`,
    meta: {
      highlights: ['Cog Finance'],
    },
  })

export const approveERC20: (params: {
  tokenAddress: `0x${string}`
  spenderAddress: `0x${string}`
  amount: bigint
  name: string
  description: string
  meta: Meta
}) => Tx = (params) => {
  const { tokenAddress, spenderAddress, amount, name, description, meta } =
    params
  return {
    name: name,
    description: description,
    to: tokenAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [spenderAddress, amount],
    }),
    abi: erc20Abi,
    meta,
  }
}

export const wrapETH: (amount: bigint) => Tx = (amount) => ({
  name: 'Wrap',
  description: `${formatEther(amount)} ETH to WETH`,
  to: wETHAddress,
  value: amount,
  data: encodeFunctionData({
    abi: WrappedEther,
    functionName: 'deposit',
    args: [],
  }),
  abi: WrappedEther as Abi,
})

export const unwrapETH: (amount: bigint) => Tx = (amount) => ({
  name: 'Unwrap',
  description: `${formatEther(amount)} WETH to ETH`,
  to: wETHAddress,
  value: 0n,
  data: encodeFunctionData({
    abi: WrappedEther,
    functionName: 'withdraw',
    args: [amount],
  }),
  abi: WrappedEther as Abi,
})

export const swapUSDCToETHByAmbient: (
  amount: bigint
) => Promise<{ tx: Tx; ethMinOut: bigint }> = async (amount) => {
  const crocEnv = new CrocEnv(scrollChainID)
  const plan = crocEnv
    .sell(usdcAddress, BigNumber.from(amount.toString()))
    .for(ethAddress, {
      slippage: slippageTolerance,
    })

  const cmd = encodeAbiParameters(
    [
      { type: 'address' },
      { type: 'address' },
      { type: 'uint256' },
      { type: 'bool' },
      { type: 'bool' },
      { type: 'uint128' },
      { type: 'uint16' },
      { type: 'uint128' },
      { type: 'uint128' },
      { type: 'uint8' },
    ],
    [
      plan.baseToken.tokenAddr as `0x${string}`,
      plan.quoteToken.tokenAddr as `0x${string}`,
      BigInt((await plan.context).chain.poolIndex),
      plan.sellBase,
      plan.qtyInBase,
      BigInt((await plan.qty).toString()),
      0,
      BigInt((await plan.calcLimitPrice()).toString()),
      BigInt((await plan.calcSlipQty()).toString()),
      0,
    ]
  )

  const slipQty = parseFloat((await plan.impact).buyQty) * (1 - plan.slippage)
  const ethMinOut = BigInt((await plan.baseToken.roundQty(slipQty)).toString())

  const tx: Tx = {
    name: 'Swap',
    description: `${formatUnits(amount, 6)} USDC to ${formatEther(ethMinOut)} ETH on Ambient`,
    to: ambientSwapAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: AmbientSwap,
      functionName: 'userCmd',
      args: [1, cmd],
    }),
    abi: AmbientSwap as Abi,
    meta: {
      highlights: ['Ambient'],
    },
  }

  return {
    tx,
    ethMinOut,
  }
}

export const swapETHToUSDCByAmbient: (
  amount: bigint
) => Promise<{ tx: Tx; plan: CrocSwapPlan }> = async (amount) => {
  const crocEnv = new CrocEnv(scrollChainID)
  const plan = crocEnv
    .sell(ethAddress, BigNumber.from(amount.toString()))
    .for(usdcAddress, {
      slippage: slippageTolerance,
    })

  const usdcToETHCmd = encodeAbiParameters(
    [
      { type: 'address' },
      { type: 'address' },
      { type: 'uint256' },
      { type: 'bool' },
      { type: 'bool' },
      { type: 'uint128' },
      { type: 'uint16' },
      { type: 'uint128' },
      { type: 'uint128' },
      { type: 'uint8' },
    ],
    [
      plan.baseToken.tokenAddr as `0x${string}`,
      plan.quoteToken.tokenAddr as `0x${string}`,
      BigInt((await plan.context).chain.poolIndex),
      plan.sellBase,
      plan.qtyInBase,
      BigInt((await plan.qty).toString()),
      0,
      BigInt((await plan.calcLimitPrice()).toString()),
      BigInt((await plan.calcSlipQty()).toString()),
      0,
    ]
  )

  const slipQty = parseFloat((await plan.impact).buyQty)
  const usdcOut = BigInt((await plan.baseToken.roundQty(slipQty)).toString())

  const tx: Tx = {
    name: 'Swap',
    description: `${formatEther(amount)} ETH to ${formatUnits(usdcOut, 18)} USDC on Ambient`,
    to: ambientSwapAddress,
    value: amount,
    data: encodeFunctionData({
      abi: AmbientSwap,
      functionName: 'userCmd',
      args: [1, usdcToETHCmd],
    }),
    abi: AmbientSwap as Abi,
    meta: {
      highlights: ['Ambient'],
    },
  }

  return {
    tx,
    plan,
  }
}

export const addWETHToCogUSDCWETHCollateral: (
  userAddress: `0x${string}`,
  amount: bigint
) => Tx = (userAddress, amount) =>
  addWETHToCogCollateral({
    userAddress,
    pairAddress: cogPairUSDCWETH,
    pair: 'USDC/WETH',
    amount,
  })

export const addWETHToCogDAIWETHCollateral: (
  userAddress: `0x${string}`,
  amount: bigint
) => Tx = (userAddress, amount) =>
  addWETHToCogCollateral({
    userAddress,
    pairAddress: cogPairDAIWETH,
    pair: 'DAI/WETH',
    amount,
  })

export const addWETHToCogCollateral: (params: {
  userAddress: `0x${string}`
  pairAddress: `0x${string}`
  pair: string
  amount: bigint
}) => Tx = (params) => {
  const { userAddress, pairAddress, pair, amount } = params
  return {
    name: 'Add',
    description: `${formatEther(amount)} WETH as collateral to Cog Finance`,
    to: pairAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: CogPair,
      functionName: 'add_collateral',
      args: [userAddress, amount],
    }),
    abi: CogPair as Abi,
    meta: {
      highlights: ['Cog Finance'],
    },
  }
}

export const borrowUSDCFromCog: (
  client: PublicClient,
  userAddress: `0x${string}`,
  amount: bigint
) => Promise<Tx> = (client, userAddress, amount) =>
  borrowFromCog({
    client,
    userAddress,
    pairAddress: cogPairUSDCWETH,
    tokenAddress: usdcAddress,
    amount,
    symbol: 'USDC',
    decimals: 6,
  })

export const borrowDAIFromCog: (
  client: PublicClient,
  userAddress: `0x${string}`,
  amount: bigint
) => Promise<Tx> = (client, userAddress, amount) =>
  borrowFromCog({
    client,
    userAddress,
    pairAddress: cogPairDAIWETH,
    tokenAddress: daiAddress,
    amount,
    symbol: 'DAI',
    decimals: 18,
  })

export const borrowFromCog: (params: {
  client: PublicClient
  userAddress: `0x${string}`
  pairAddress: `0x${string}`
  tokenAddress: `0x${string}`
  amount: bigint
  symbol: string
  decimals: number
}) => Promise<Tx> = async (params) => {
  const {
    client,
    userAddress,
    pairAddress,
    tokenAddress,
    amount,
    symbol,
    decimals,
  } = params

  const tokenContract = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: client,
  })

  const tokenBalanceForPair = (await tokenContract.read.balanceOf([
    pairAddress,
  ])) as bigint

  if (tokenBalanceForPair < amount) {
    throw new Error(
      `${symbol} NOT enough in Cog Finance Pair, only ${formatUnits(tokenBalanceForPair, decimals)} left! Please wait or supply less amount!`
    )
  }

  return {
    name: `Borrow`,
    description: `${formatUnits(amount, decimals)} ${symbol} in half of the collateral WETH from Cog Finance`,
    to: pairAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: CogPair,
      functionName: 'borrow',
      args: [amount, userAddress, userAddress],
    }),
    abi: CogPair as Abi,
    meta: {
      highlights: ['Cog Finance'],
    },
  }
}

export const repayUSDCToCog: (amount: bigint) => Tx = (amount) =>
  repayToCog({
    pairAddress: cogPairUSDCWETH,
    amount: amount,
    symbol: 'USDC',
    decimals: 6,
    pair: 'USDC/WETH',
  })

export const repayDAIToCog: (amount: bigint) => Tx = (amount) =>
  repayToCog({
    pairAddress: cogPairDAIWETH,
    amount: amount,
    symbol: 'DAI',
    decimals: 18,
    pair: 'DAI/WETH',
  })

export const repayToCog: (params: {
  pairAddress: `0x${string}`
  amount: bigint
  symbol: string
  decimals: number
  pair: string
}) => Tx = (params) => {
  const { pairAddress, amount, symbol, decimals, pair } = params
  return {
    name: `Repay`,
    description: `${formatUnits(amount, decimals)} ${symbol} to Cog Finance`,
    to: pairAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: CogPair,
      functionName: 'repay',
      args: [amount],
    }),
    abi: CogPair as Abi,
    meta: {
      highlights: ['Cog Finance'],
    },
  }
}

export const removeUSDCWETHCollateralFromCog: (
  amount: bigint,
  userAddress: `0x${string}`
) => Tx = (amount, userAddress) =>
  removeCollateralFromCog({
    pairAddress: cogPairUSDCWETH,
    userAddress,
    amount,
    stableTokenSymbol: 'USDC',
  })

export const removeDAIWETHCollateralFromCog: (
  amount: bigint,
  userAddress: `0x${string}`
) => Tx = (amount, userAddress) =>
  removeCollateralFromCog({
    pairAddress: cogPairDAIWETH,
    userAddress,
    amount,
    stableTokenSymbol: 'DAI',
  })

export const removeCollateralFromCog: (params: {
  pairAddress: `0x${string}`
  userAddress: string
  amount: bigint
  stableTokenSymbol: string
}) => Tx = (params) => {
  const { pairAddress, userAddress, amount, stableTokenSymbol } = params
  return {
    name: 'Remove',
    description: `${formatEther(amount)} WETH Collateral ${stableTokenSymbol}) from Cog Finance`,
    to: pairAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: CogPair,
      functionName: 'remove_collateral',
      args: [userAddress, amount],
    }),
    abi: CogPair as Abi,
    meta: {
      highlights: ['Cog Finance'],
    },
  }
}

// refer from: https://scrollscan.com/address/0x63fdafa50c09c49f594f47ea7194b721291ec50f#code
export const predictBorrowShareBase = async (
  client: PublicClient,
  pairAddress: `0x${string}`,
  amount: bigint,
  adjust: number = 1
) => {
  const cogPairContract = getContract({
    address: pairAddress,
    abi: CogPair,
    client: client,
  })
  // total_brorrow check
  const { elastic: totalElastic, base: totalBase } =
    (await cogPairContract.read.total_borrow()) as {
      elastic: bigint
      base: bigint
    }
  // BORROW_OPENING_FEE = 50
  // BORROW_OPENING_FEE_PRECISION = 100000
  // fee_amount = ( amount * BORROW_OPENING_FEE) / BORROW_OPENING_FEE_PRECISION
  const feeAmount = amount / BigInt(2000)

  // elastic = amount + fee_amount
  // base = (elastic * total_base) / total_elastic
  const elastic = amount + feeAmount
  const base = (elastic * totalBase) / totalElastic
  // for safe to repay, minus 3
  const accuracy = '1000000000000000000'
  const adjustDivide = BigInt((1.0 / adjust) * Number(accuracy))
  return (base * BigInt(accuracy)) / adjustDivide - BigInt(3)
}
