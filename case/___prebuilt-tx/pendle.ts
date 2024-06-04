import { Address, Chain, formatUnits } from 'viem'
import { Tx } from '../types'
import { getDecimals } from '../utils'

export enum PendleOutputType {
  Pt = 'Pt',
  Yt = 'Yt',
}

export type PendleSwapContext = PendleBaseContext & {
  syTokenInAddr: Address
}

export type PendleBaseContext = {
  chain: Chain
  receiverAddr: Address
  marketAddr: Address
  tokenInAddr: Address
  amountTokenIn: bigint
  slippage: number // 0.002 for 0.2% slippage
}

export class PendleResponseFailedError extends Error {
  constructor(
    message: string = "Couldn't get a proper response from Pendle's api, try again later."
  ) {
    super(message)
  }
}
/**
 * @param syTokenAddr sy token will not expire, so we can use this to get current market address
 * @returns market address
 */
export const getMarketAddr = async ({
  chainId,
  syTokenAddr,
}: {
  chainId: string
  syTokenAddr: string
}): Promise<Address> => {
  const marketInfo = await fetchJSON(
    `https://api-v2.pendle.finance/core/v1/${chainId}/markets?` +
      new URLSearchParams({
        select: 'all',
        is_expired: 'false',
        sy: syTokenAddr,
      })
  )
  return marketInfo.results[0].address as Address
}

export const swapExactToken = async (
  outputType: PendleOutputType,
  context: PendleSwapContext,
  extraInfo: { tokenInName: string; outputTokenName: string }
): Promise<{
  tx: Tx
  routerAddress: Address
  outputTokenAmount: bigint
}> => {
  const { to, data, outputTokenAmount } = await getSwapExactTokenData(
    outputType,
    context
  )

  let tokenInDecimals: number
  if (context.tokenInAddr === '0x0000000000000000000000000000000000000000') {
    tokenInDecimals = 18
  } else {
    tokenInDecimals = await getDecimals(
      context.tokenInAddr,
      context.chain
    )
  }
  const tokenOutDecimals = await getDecimals(
    context.syTokenInAddr,
    context.chain
  )

  const value =
    extraInfo.tokenInName.toUpperCase() === 'ETH' ? context.amountTokenIn : 0n

  return {
    tx: {
      name: `Swap`,
      description: `${formatUnits(context.amountTokenIn, tokenInDecimals)} ${extraInfo.tokenInName} to ${formatUnits(outputTokenAmount, tokenOutDecimals)} ${extraInfo.outputTokenName} on Pendle`,
      to,
      value,
      data,
      meta: {
        highlights: ['Pendle'],
      },
    },
    routerAddress: to,
    outputTokenAmount,
  }
}

export const addLiquiditySingleTokenData = async (
  context: PendleBaseContext,
  extraInfo: { tokenInName: string }
): Promise<{
  tx: Tx
  routerAddress: Address
}> => {
  const syTokenInOut = await syTokenInOutData(
    context.chain.id.toString(),
    context.marketAddr
  )
  if (!syTokenInOut) throw new PendleResponseFailedError()

  const transactionInfo = await fetchJSON(
    'https://api-v2.pendle.finance/sdk/api/v1/addLiquiditySingleToken?' +
      new URLSearchParams({
        chainId: context.chain.id.toString(),
        receiverAddr: context.receiverAddr,
        marketAddr: context.marketAddr,
        tokenInAddr: context.tokenInAddr,
        amountTokenIn: context.amountTokenIn.toString(),
        syTokenInAddr: syTokenInOut.outputTokens[0] as Address,
        slippage: context.slippage.toString(),
      })
  )

  if (!transactionInfo) throw new PendleResponseFailedError()
  return {
    tx: {
      name: 'Provide',
      description: `Liquidity to PT/SY pool of ${extraInfo.tokenInName} on Pendle`,
      to: transactionInfo.transaction.to,
      value: 0n,
      data: transactionInfo.transaction.data,
      meta: {
        highlights: ['Pendle'],
      },
    },
    routerAddress: transactionInfo.transaction.to,
  }
}

const syTokenInOutData = async (
  chainId: string,
  marketAddr: Address
): Promise<{ outputTokens: string[] } | null> => {
  return await fetchJSON(
    'https://api-v2.pendle.finance/sdk/api/v1/syTokenInOut?' +
      new URLSearchParams({
        chainId,
        marketAddr,
      })
  )
}

const getSwapExactTokenData = async (
  outputType: PendleOutputType,
  context: PendleSwapContext
) => {
  const json = await fetchJSON(
    `https://api-v2.pendle.finance/sdk/api/v1/swapExactTokenFor${outputType}?` +
      new URLSearchParams({
        chainId: context.chain.id.toString(),
        receiverAddr: context.receiverAddr,
        marketAddr: context.marketAddr,
        tokenInAddr: context.tokenInAddr,
        amountTokenIn: context.amountTokenIn.toString(),
        syTokenInAddr: context.syTokenInAddr,
        slippage: context.slippage.toString(),
      })
  )

  let outputTokenAmount: bigint
  switch (outputType) {
    case PendleOutputType.Pt:
      outputTokenAmount = json.data.amountPtOut
      break
    case PendleOutputType.Yt:
      outputTokenAmount = json.data.amountYtOut
      break
    default:
      throw new Error(`Incorrect output type`)
  }

  return {
    to: json.transaction.to,
    data: json.transaction.data,
    outputTokenAmount,
  }
}

const fetchJSON = async (request: string | URL | Request) => {
  try {
    const response = await fetch(request)
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new TypeError("Oops, we haven't got JSON!")
    }
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`${response.status}: ${error.message}`)
    }
    const jsonData = await response.json()
    return jsonData
  } catch (error) {
    console.error('Error:', error)
  }
  return null
}
