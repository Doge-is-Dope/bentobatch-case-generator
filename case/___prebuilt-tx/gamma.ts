import {
  Abi,
  Address,
  Chain,
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  getContract,
  http,
} from 'viem'
import UniProxy from './abi/UniProxy.json'
import Hypervisor from './abi/Hypervisor.json'
import { PreviewTx, Tx } from '../types'
import { getDecimals } from '../utils'

export const protocolName = 'Gamma'

/**
 * @property The symbol of the token to display to user.
 * @property The address of the token.
 * @property The amount of the token.
 */
export type TokenInfo = {
  symbol: string
  address: Address
  amount: bigint
}

/**
 * Get the amount of the other token amount from one token base on https://docs.gamma.xyz/gamma/dev/developer-portal
 * If the pair is A token with B token, the token address can be either of them, and the output will be the opposit of the input token. e.g. call this function with A token will return the amount B token paired with A.
 * @param uniProxyAddress The proxy address provide the info, will be different based on each chain. The address can be found here https://docs.google.com/spreadsheets/d/19i8dQt-F3TncJ2jlYWOJ-cOmnleKvqz1rJiiv-QTS9M/edit#gid=0.
 * @param lpTokenAddress The address of the LP token of the pair.
 * @param tokenAddress An arbitrary token of the pair. e.g. for USDC.e/WETH, the token should be either the address of USDC.e or WETH.
 * @param tokenAmount The amount of token above.
 * @return Promise of the amount of token should pair.
 */
export const getDepositAmount = async ({
  chain,
  uniProxyAddress,
  lpTokenAddress,
  tokenAddress,
  tokenAmount,
}: {
  chain: Chain
  uniProxyAddress: Address
  lpTokenAddress: Address
  tokenAddress: Address
  tokenAmount: bigint
}): Promise<bigint> => {
  const client = createPublicClient({
    chain: chain,
    transport: http(),
  })

  const uniProxyContract = getContract({
    address: uniProxyAddress,
    abi: UniProxy as Abi,
    client: client,
  })

  const [amountStart, amountEnd] =
    (await uniProxyContract.read.getDepositAmount([
      lpTokenAddress,
      tokenAddress,
      tokenAmount,
    ])) as bigint[]

  const pairedTokenAmount = (amountStart + amountEnd) / 2n

  return pairedTokenAmount
}

/**
 * Create preview tx for depositing token to Gamma vault.
 * @param token0Symbol The token specified on chain from the LP token. e.g. take this https://polygonscan.com/address/0x3Cc20A6795c4b57d9817399F68E83e71C8626580#readContract for instance, it will be USDC.e
 * @param token1Symbol The token specified on chain from the LP token. e.g. take this https://polygonscan.com/address/0x3Cc20A6795c4b57d9817399F68E83e71C8626580#readContract for instance, it will be WETH
 * @returns PreviewTx
 */
export const depositPreviewTx = ({
  token0Symbol,
  token1Symbol,
  uniProxyAddress,
}: {
  token0Symbol: string
  token1Symbol: string
  uniProxyAddress: Address
}): PreviewTx => {
  return {
    name: 'Deposit',
    description: `${token0Symbol} and ${token1Symbol} to ${protocolName}`,
    to: uniProxyAddress,
    meta: {
      highlights: [protocolName],
    }
  }
}

/**
 * Create a tx for depositing token to Gamma vault.
 * It's caller's responsibility to find out what are the corresponding token0 and token1 from the chain. It can be found from the explorer's Read Contract of the LP token contract.
 * @param chain The chain that interacting with.
 * @param uniProxyAddress The proxy address provide the info, will be different based on each chain. The address can be found here https://docs.google.com/spreadsheets/d/19i8dQt-F3TncJ2jlYWOJ-cOmnleKvqz1rJiiv-QTS9M/edit#gid=0.
 * @param userAddress The user's address.
 * @param lpTokenAddress The address of the token you will receive after depositing to this vault.
 * @param token0Info The token specified on chain from the LP token. e.g. take this https://polygonscan.com/address/0x3Cc20A6795c4b57d9817399F68E83e71C8626580#readContract for instance, it will be USDC.e
 * @param token1Info The token specified on chain from the LP token. e.g. take this https://polygonscan.com/address/0x3Cc20A6795c4b57d9817399F68E83e71C8626580#readContract for instance, it will be WETH
 * @returns Tx
 * @returns safeShares The adjusted value of the calculated LP token share in case the actual value vary with the delay of the inclusion of block.
 * @returns sharesDecimals The decimals of the LP token share.
 */
export const depositTx = async ({
  chain,
  uniProxyAddress,
  userAddress,
  lpTokenAddress,
  token0Info,
  token1Info,
}: {
  chain: Chain
  uniProxyAddress: Address
  userAddress: Address
  lpTokenAddress: Address
  token0Info: TokenInfo
  token1Info: TokenInfo
}): Promise<{
  tx: Tx,
  safeShares: bigint,
  sharesDecimals: number
}> => {
  const client = createPublicClient({
    chain: chain,
    transport: http(),
  })

  const lpTokenContract = getContract({
    address: lpTokenAddress,
    abi: Hypervisor as Abi,
    client: client,
  })

  const token0 = (await lpTokenContract.read.token0([])) as Address
  const token1 = (await lpTokenContract.read.token1([])) as Address

  checkTokensInfo({
    token0Info,
    token1Info,
    token0,
    token1,
  })

  const token0Decimals = await getDecimals(token0Info.address, chain)
  const token1Decimals = await getDecimals(token1Info.address, chain)

  const param = [
    token0Info.amount,
    token1Info.amount,
    userAddress,
    lpTokenAddress,
    [0, 0, 0, 0],
  ]

  const currentTick = await lpTokenContract.read.currentTick() as number
  const precision = await lpTokenContract.read.PRECISION() as bigint

  const [total0, total1] = await lpTokenContract.read.getTotalAmounts() as [bigint, bigint]
  const totalSupply = await lpTokenContract.read.totalSupply() as bigint
  const shares = calculateShares({
    currentTick: BigInt(currentTick),
    precision,
    token0Amount: token0Info.amount,
    token1Amount: token1Info.amount,
    total0,
    total1,
    totalSupply
  })

  // the local culculation might differ from the actual value, just in case the LP received has changed.
  const safeShares = shares * 9999n / 10000n

  const sharesDecimals = await lpTokenContract.read.decimals([]) as number

  return {
    tx: {
      name: 'Deposit',
      description: `${formatUnits(token0Info.amount, token0Decimals)} ${token0Info.symbol} and ${formatUnits(token1Info.amount, token1Decimals)} ${token1Info.symbol} to ${protocolName}`,
      to: uniProxyAddress,
      value: 0n,
      data: encodeFunctionData({
        abi: UniProxy,
        functionName: 'deposit',
        args: param,
      }),
      abi: UniProxy as Abi,
      meta: {
        highlights: [protocolName],
      },
    },
    safeShares,
    sharesDecimals
  }
}

const checkTokensInfo = ({
  token0Info,
  token1Info,
  token0,
  token1,
}: {
  token0Info: TokenInfo
  token1Info: TokenInfo
  token0: Address
  token1: Address
}) => {
  const errorMessage =
    "Thw two addresses input doesn't match with the tokens of this LP pair."
  if (token0Info.address !== token0) throw new Error(errorMessage)
  if (token1Info.address !== token1) throw new Error(errorMessage)
}

const calculateShares = ({
  currentTick,
  precision,
  token0Amount,
  token1Amount,
  total0,
  total1,
  totalSupply
}: {
  currentTick: bigint
  precision: bigint
  token0Amount: bigint
  token1Amount: bigint
  total0: bigint
  total1: bigint
  totalSupply: bigint
}) => {

  const sqrtPrice = getSqrtRatioAtTick(BigInt(currentTick))
  const price = (sqrtPrice * sqrtPrice * precision) / (2n ** (96n * 2n));

  let shares = token1Amount + (token0Amount * BigInt(price) / precision);
  if (totalSupply !== 0n) {
    const pool0PricedInToken1 = (total0 * price) / precision;
    const mul = shares * totalSupply
    const sum = pool0PricedInToken1 + total1
    shares = mul / sum

  }
  return shares
}

const getSqrtRatioAtTick = (tick: bigint): bigint => {
  const MAX_TICK = 887272n;

  // Get absolute value
  const mask = tick >> 23n;
  const absTick = (tick ^ mask) - mask;
  if (absTick > MAX_TICK) throw new Error('T');

  let ratio = absTick & 0x1n ? 0xfffcb933bd6fad37aa2d162d1a594001n : 0x100000000000000000000000000000000n;
  if (absTick & 0x2n) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
  if (absTick & 0x4n) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  if (absTick & 0x8n) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
  if (absTick & 0x10n) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  if (absTick & 0x20n) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  if (absTick & 0x40n) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  if (absTick & 0x80n) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
  if (absTick & 0x100n) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
  if (absTick & 0x200n) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
  if (absTick & 0x400n) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
  if (absTick & 0x800n) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
  if (absTick & 0x1000n) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  if (absTick & 0x2000n) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  if (absTick & 0x4000n) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  if (absTick & 0x8000n) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
  if (absTick & 0x10000n) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
  if (absTick & 0x20000n) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
  if (absTick & 0x40000n) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
  if (absTick & 0x80000n) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

  if (tick > 0) ratio = (0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn / ratio);

  // This divides by 1<<32 rounding up to go from a Q128.128 to a Q128.96.
  // We then downcast because we know the result always fits within 160 bits due to our tick input constraint.
  // We round up in the division so getTickAtSqrtRatio of the output price is always consistent.
  const price = (ratio >> 32n) + (ratio % (1n << 32n) === 0n ? 0n : 1n);
  return price;
};
