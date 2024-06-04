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
  encodeAbiParameters,
  encodeFunctionData,
  formatEther,
  formatUnits,
  getContract,
  http,
  parseUnits,
  PublicClient,
} from 'viem'
import Penpad from './abi/Penpad.json'
import SyncswapClassicPoolFactory from './abi/SyncSwapClassicPoolFactory.json'
import SyncswapClassicPool from './abi/SyncSwapClassicPool.json'
import SyncswapRouter from './abi/SyncSwapRouter.json'
import SpaceFi from './abi/SpaceFi.json'
import { fetchRouteSummary, postBuildRoute, RouteData } from './kyberswap'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './kol.details'
import { approveERC20 } from './utils'

const scrollChainID = 0x82750

const zeroAddress = '0x0000000000000000000000000000000000000000'
// NOTE: following address only for Scroll chain
const ethAddress = '0x0000000000000000000000000000000000000000'
const usdcAddress = '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4'
const wETHAddress = '0x5300000000000000000000000000000000000004'
// syncswap address
const syncswapClassicPoolFactoryAddress =
  '0x37BAc764494c8db4e54BDE72f6965beA9fa0AC2d'
const syncswapRouterAddress = '0x80e38291e06339d10AAB483C65695D004dBD5C69'
// kyber swap address
const kyberswapNativeEthAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
// spacefi address
const spacefiRouterAddress = '0x18b71386418A9FCa5Ae7165E31c385a5130011b6'
// penpad staking address
const penpadStakingAddress = '0x8F53fA7928305Fd4f78c12BA9d9DE6B2420A2188'

const predictedUSDCKyberSwapRouter =
  '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5'

const swapETHToUSDCBySyncswap: (
  client: PublicClient,
  userAddress: `0x${string}`,
  amount: bigint
) => Promise<{ tx: Tx; amountOutMin: bigint }> = async (
  client,
  userAddress,
  amount
) => {
  const classicPoolFactory = getContract({
    address: syncswapClassicPoolFactoryAddress,
    abi: SyncswapClassicPoolFactory,
    client: client,
  })

  const poolAddress = (await classicPoolFactory.read.getPool([
    wETHAddress,
    usdcAddress,
  ])) as `0x${string}`

  if (poolAddress === zeroAddress) {
    throw new Error('Pool does not exist')
  }

  const pool = getContract({
    address: poolAddress,
    abi: SyncswapClassicPool,
    client: client,
  })
  let amountOutMin = (await pool.read.getAmountOut([
    ethAddress,
    amount,
    userAddress,
  ])) as bigint
  amountOutMin = (amountOutMin * BigInt(980)) / BigInt(1000) // 2% slippage

  // Constructs the swap paths with steps.
  // Determine withdraw mode, to withdraw native ETH or wETH on last step.
  // 0 - vault internal transfer
  // 1 - withdraw and unwrap to naitve ETH
  // 2 - withdraw and wrap to wETH
  const withdrawMode = 1 // 1 or 2 to withdraw to user's wallet

  const swapData = encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }, { type: 'uint8' }],
    [wETHAddress, userAddress, withdrawMode]
  )

  const steps = [
    {
      pool: poolAddress,
      data: swapData,
      callback: zeroAddress,
      callbackData: '0x',
    },
  ]

  const paths = [
    {
      steps: steps,
      tokenIn: ethAddress,
      amountIn: amount,
    },
  ]

  const deadline = Math.floor(Date.now() / 1000) + 300 // 5 minutes from now

  const tx: Tx = {
    name: 'Swap',
    description: `${formatEther(amount)} ETH to at least ${formatUnits(amountOutMin, 6)} USDC on Scroll using Syncswap`,
    to: syncswapRouterAddress,
    value: amount,
    data: encodeFunctionData({
      abi: SyncswapRouter,
      functionName: 'swap',
      args: [paths, amountOutMin, deadline],
    }),
    abi: SyncswapRouter as Abi,
    meta: {
      highlights: ['Syncswap'],
    },
  }

  return {
    tx,
    amountOutMin,
  }
}

const approveUSDCToKyberSwap: (router: `0x${string}`, amount: bigint) => Tx = (
  router,
  amount
) =>
  approveERC20({
    tokenAddress: usdcAddress,
    spenderAddress: router,
    amount: amount,
    name: 'Approve',
    description: `${formatUnits(amount, 6)} USDC to KyberSwap`,
    meta: {
      highlights: ['KyberSwap'],
    },
  })

const swapByRouteDataOnKyberSwap: (
  userAddress: `0x${string}`,
  routeData: RouteData
) => Promise<Tx> = async (userAddress, routeData) => {
  const amountIn = BigInt(routeData.amountIn)
  const amountOut = BigInt(routeData.amountOut)
  let tx: Tx = {
    name: 'Swap',
    description: `${formatUnits(amountIn, 6)} USDC to ${formatEther(amountOut)} ETH on KyberSwap`,
    to: routeData.routerAddress as `0x${string}`,
    value: 0n,
    data: routeData.data as `0x${string}`,
    meta: {
      highlights: ['KyberSwap'],
    },
  }

  return tx
}

const approveUSDCtoSpaceFi: (amount: bigint) => Tx = (amount) =>
  approveERC20({
    tokenAddress: usdcAddress,
    spenderAddress: spacefiRouterAddress,
    amount: amount,
    name: 'Approve',
    description: `${formatUnits(amount, 6)} USDC to SpaceFi`,
    meta: {
      highlights: ['SpaceFi'],
    },
  })

const swapUSDCToETHBySpaceFi: (
  client: PublicClient,
  userAddress: `0x${string}`,
  amountIn: bigint
) => Promise<Tx> = async (client, userAddress, amountIn) => {
  const routerContract = getContract({
    address: spacefiRouterAddress,
    abi: SpaceFi,
    client: client,
  })

  let amountOuts = (await routerContract.read.getAmountsOut([
    amountIn,
    [usdcAddress, wETHAddress],
  ])) as bigint[]
  if (amountOuts.length < 1) {
    throw new Error('Failed to get amount out on SpaceFi')
  }
  let amountOutMin = (amountOuts[0] * BigInt(9)) / BigInt(10) // 10% slippage due to spacefi pool size is small

  let deadline = Math.floor(Date.now() / 1000) + 300 // 5 minutes from now

  let tx: Tx = {
    name: 'Swap',
    description: `${formatUnits(amountIn, 6)} USDC to ETH on Scroll using SpaceFi`,
    to: spacefiRouterAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: SpaceFi,
      functionName: 'swapExactTokensForETH',
      args: [
        amountIn,
        amountOutMin,
        [usdcAddress, wETHAddress],
        userAddress,
        deadline,
      ],
    }),
    abi: SpaceFi as Abi,
    meta: {
      highlights: ['SpaceFi'],
    },
  }

  return tx
}

const depositToPenpad: (amount: bigint) => Tx = (amount) => {
  return {
    name: 'Deposit',
    description: `${formatEther(amount)} ETH to Penpad`,
    to: penpadStakingAddress,
    value: amount,
    data: encodeFunctionData({
      abi: Penpad,
      functionName: 'stake',
      args: [],
    }),
    abi: Penpad as Abi,
    meta: {
      highlights: ['Penpad'],
    },
  }
}

const KOL_TAGS = [
  { title: TagTitle.Official },
  { title: TagTitle.Benefits },
  { title: TagTitle.Defi },
  { title: TagTitle.Swap },
  { title: TagTitle.Staking },
]

const scrollAirdropHuntingFromKOL: BatchCase = {
  id: 'scroll_airdrop_hunting_with_penpad',
  name: '🔥 Earn extra 10% Penpad Points and share up to 10000 $BLT prize pool ',
  description:
    'Engage with the Scroll ecosystem effortlessly by swapping ETH/USDC on SyncSwap, KyberNetwork, and SpaceFi, then stake your ETH to Penpad all in just One Click.',
  details: BATCH_DETAILS,
  website: {
    title: 'Penpad',
    url: 'https://penpad.io/staking',
  },
  tags: KOL_TAGS,
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  networkId: scrollChainID,
  atomic: true,
  renderExpiry: 15,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'ETH Amount',
      inputType: InputType.NativeAmount,
      description: 'Amount to swap to USDC, then swap to ETH',
      validate: decimalValidator(18, BigInt(0), BigInt(0.1 * 10 ** 18)),
      actionContent: balance,
      actionButtons: [max],
    },
    {
      name: 'ETH Amount',
      inputType: InputType.NativeAmount,
      description: 'Amount to stake, require 0.05 eth minimum',
      validate: decimalValidator(18, BigInt(0.05 * 10 ** 18)),
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
    const userAddress = context.account.address as `0x${string}`
    const client: PublicClient = createPublicClient({
      chain: context.chain,
      transport: http(),
    })

    // sanity check
    const balance = await client.getBalance({ address: userAddress })
    const ethToSwap = parseUnits(inputs[0], 18)
    const ethToStake = parseUnits(inputs[1], 18)
    if (balance < ethToSwap + ethToStake) {
      throw new Error('Total amount is insufficient')
    }

    let txs: Tx[] = []

    // 1
    const { tx, amountOutMin } = await swapETHToUSDCBySyncswap(
      client,
      userAddress,
      ethToSwap
    )
    txs.push(tx)

    // split half of the amountOutMin to swap
    const splitAmoutOut = BigInt(amountOutMin) / BigInt(2)
    const tokenOut = kyberswapNativeEthAddress
    const tokenIn = usdcAddress
    const routeSummary = await fetchRouteSummary(
      tokenIn,
      tokenOut,
      splitAmoutOut
    )
    const routeData = await postBuildRoute(
      routeSummary,
      userAddress,
      userAddress
    )

    // 2
    txs.push(
      approveUSDCToKyberSwap(
        routeData.routerAddress as `0x${string}`,
        BigInt(routeData.amountIn)
      )
    )

    // 3
    txs.push(await swapByRouteDataOnKyberSwap(userAddress, routeData))

    // 4
    txs.push(approveUSDCtoSpaceFi(splitAmoutOut))

    // 5
    txs.push(
      await swapUSDCToETHBySpaceFi(
        client,
        context.account.address as `0x${string}`,
        splitAmoutOut
      )
    )

    // 6
    txs.push(depositToPenpad(ethToStake))

    return txs
  },
  previewTx: [
    {
      name: 'Swap',
      description: 'ETH to USDC on Scroll using Syncswap',
      to: syncswapRouterAddress,
      meta: {
        highlights: ['Syncswap'],
      },
    },
    {
      name: 'Approve',
      description: 'USDC to KyberSwap',
      to: usdcAddress,
      meta: {
        highlights: ['KyberSwap'],
      },
    },
    {
      name: 'Swap',
      description: '50% USDC to ETH on KyberSwap',
      to: predictedUSDCKyberSwapRouter,
      meta: {
        highlights: ['KyberSwap'],
      },
    },
    {
      name: 'Approve',
      description: 'USDC to SpaceFi',
      to: usdcAddress,
      meta: {
        highlights: ['SpaceFi'],
      },
    },
    {
      name: 'Swap',
      description: '50% USDC to ETH on Scroll using SpaceFi',
      to: spacefiRouterAddress,
      meta: {
        highlights: ['SpaceFi'],
      },
    },
    {
      name: 'Deposit',
      description: 'ETH to Penpad',
      to: penpadStakingAddress,
      meta: {
        highlights: ['Penpad'],
      },
    },
  ],
  setActions: () => {
    return [
      {
        href: 'https://penpad.io/staking',
        text: 'Check Points (Penpad)',
      },
    ]
  },
}

export default scrollAirdropHuntingFromKOL
