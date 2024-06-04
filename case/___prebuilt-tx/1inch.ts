import type { Abi, Address } from 'abitype'
import { formatUnits, parseUnits } from 'viem'
import { PreviewTx, Tx } from '@/models/cases/v3/types'
import ONEINCH from '@/models/abi/1inch.json'

export enum ActionType {
  Swap = 'swap',
  Quote = 'quote',
}

export class InputAmountTooSmall extends Error {
  constructor(
    message: string = 'Might be input amount too small, try using bigger amount.'
  ) {
    super(message)
  }
}

/**
 * Create preview tx for token swap.
 * @param chainId Chain id with decimal format.
 * @param srcTokenSymbol Symbol of source token, e.g. USDC.
 * @param dstTokenSymbol Symbol of destination token, e.g. USDT.
 * @return PreviewTx
 */
export const swapPreviewTx: (params: {
  chainId: number
  srcTokenSymbol: string
  dstTokenSymbol: string
}) => PreviewTx = (params) => {
  const { chainId, srcTokenSymbol, dstTokenSymbol } = params
  let oneInchAddress: Address
  switch (chainId) {
    case 1:
    case 42161:
    case 43114:
    case 8453:
    case 56:
    case 10:
    case 137:
    case 250:
    case 100:
    case 8217:
    case 1313161554:
      oneInchAddress = '0x111111125421ca6dc452d289314280a0f8842a65'
      break
    case 324:
      oneInchAddress = '0x6fd4383cb451173d5f9304f041c7bcbf27d561ff'
      break
    default:
      throw Error(`Chain Id ${chainId} is not supported by 1inch`)
  }
  return {
    name: 'Swap',
    description: `${srcTokenSymbol} to ${dstTokenSymbol} at 1inch`,
    to: oneInchAddress,
    meta: {
      highlights: ['1inch'],
    },
  }
}

/**
 * Create tx for token swap using 1inch.
 * @param chainId Chain id with decimal format.
 * @param userAddress User account address.
 * @param srcTokenAddress Contract address of source token, use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native token.
 * @param srcTokenSymbol Symbol of source token, e.g. USDC.
 * @param srcTokenDecimals Decimals of source token, e.g. 6.
 * @param srcAmount Amount of source token with wei format, e.g. 1000000.
 * @param dstTokenAddress Contract address of destination token, use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native token.
 * @param dstTokenSymbol Symbol of destination token, e.g. USDT.
 * @param dstTokenDecimals Decimals of destination token, e.g. 6.
 * @return Promise of Tx
 */
export const swapTx: (params: {
  chainId: number
  userAddress: Address
  srcTokenAddress: Address
  srcTokenSymbol: string
  srcTokenDecimals: number
  srcAmount: bigint
  dstTokenAddress: Address
  dstTokenSymbol: string
  dstTokenDecimals: number
}) => Promise<{
  tx: Tx
  dstAmount: bigint
}> = async (params) => {
  const {
    chainId,
    userAddress,
    srcTokenAddress,
    srcTokenSymbol,
    srcTokenDecimals,
    srcAmount,
    dstTokenAddress,
    dstTokenSymbol,
    dstTokenDecimals,
  } = params
  const query = new URLSearchParams({
    action: ActionType.Swap,
    src: srcTokenAddress,
    dst: dstTokenAddress,
    amount: srcAmount.toString(),
    from: userAddress,
    slippage: '0.5',
    disableEstimate: 'true',
  })
  try {
    const { dstAmount, to, value, data } = await getSwapCalldata(chainId, query)
    return {
      tx: {
        name: 'Swap',
        description: `${formatUnits(srcAmount, srcTokenDecimals)} ${srcTokenSymbol} to ${formatUnits(dstAmount, dstTokenDecimals)} ${dstTokenSymbol} at 1inch`,
        to: to,
        value: value,
        data: data,
        abi: ONEINCH as Abi,
        meta: {
          highlights: ['1inch'],
        },
      },
      dstAmount: BigInt(dstAmount),
    }
  } catch (error: any) {
    const err = getError(error)
    throw err
  }
}

/**
 * Find the best quote to swap with 1inch Router.
 * @param chainId Chain id with decimal format.
 * @param srcTokenAddress Contract address of source token, use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native token.
 * @param srcAmount Amount of source token with wei format, e.g. 1000000.
 * @param dstTokenAddress Contract address of destination token, use 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native token.
 * @return Promise of Tx
 */
export const getQuote: (params: {
  chainId: number
  srcTokenAddress: Address
  srcAmount: bigint
  dstTokenAddress: Address
}) => Promise<bigint> = async (params) => {
  const { chainId, srcTokenAddress, srcAmount, dstTokenAddress } = params
  const query = new URLSearchParams({
    action: ActionType.Quote,
    src: srcTokenAddress,
    dst: dstTokenAddress,
    amount: srcAmount.toString(),
  })
  const { dstAmount } = await getQuoteData(chainId, query)
  return dstAmount
}

/**
 * Base on the dev of 1inch, v6 api doesn't support asking src token amount by fixed dstToken amount, so we infer the value with slippage.
 */
export const getSrcTokenAmount = async (param: {
  chainId: number
  srcTokenAddress: Address
  dstAmount: bigint
  dstTokenAddress: Address
  buffer: number
}): Promise<bigint> => {
  const trialBase = parseUnits('1', 18)
  const trialQuote = await getQuote({
    chainId: param.chainId,
    srcTokenAddress: param.srcTokenAddress,
    srcAmount: trialBase,
    dstTokenAddress: param.dstTokenAddress,
  })
  const multiplier = 10n ** 18n
  const srcAmount =
    (param.dstAmount *
      trialBase *
      BigInt((1 + param.buffer) * Number(multiplier))) /
    trialQuote /
    multiplier

  const base = await getQuote({
    chainId: param.chainId,
    srcTokenAddress: param.srcTokenAddress,
    srcAmount: srcAmount,
    dstTokenAddress: param.dstTokenAddress,
  })
  if (base > param.dstAmount) {
    return srcAmount
  } else {
    throw new InputAmountTooSmall()
  }
}

const getSwapCalldata = async (chainId: number, query: URLSearchParams) => {
  const response = await fetch(`/case/api/1inch/${chainId}?` + query)
  if (!response.ok) {
    const errorRes = await response.json()
    const err = getError(errorRes)
    throw err
  }
  const json = await response.json()
  return {
    dstAmount: json.dstAmount as bigint,
    to: json.tx.to as Address,
    value: BigInt(json.tx.value),
    data: json.tx.data as `0x${string}`,
  }
}

const getQuoteData = async (chainId: number, query: URLSearchParams) => {
  const response = await fetch(`/case/api/1inch/${chainId}?` + query)
  if (!response.ok) {
    const errorRes = await response.json()
    const err = getError(errorRes)
    throw err
  }
  const json = await response.json()
  return {
    dstAmount: BigInt(json.dstAmount),
  }
}

const getError = (errorRes: any): Error => {
  if (errorRes.error === 'insufficient liquidity') {
    return new InputAmountTooSmall()
  }
  return new Error(`${errorRes.error}`)
}
