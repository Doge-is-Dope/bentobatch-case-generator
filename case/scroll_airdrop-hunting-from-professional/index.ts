import {
  Context,
  BatchCase,
  InputType,
  Tx,
  TagTitle,
  WalletType,
} from '@/models/cases/v3/types'
import { balance, decimalValidator, max } from '@/models/cases/v3/utils'
import { createPublicClient, http, parseUnits, PublicClient } from 'viem'
import BATCH_DETAILS, {
  ATTRIBUTES,
  CASE_PROTOCOLS,
} from './professional.details'
import {
  approveERC20,
  approveUSDCToAmbient,
  approveWETHToCogPairUSDCWETH,
  approveUSDCToCogPairUSDCWETH,
  approveDAIToCogPairDAIWETH,
  approveWETHToCogPairDAIWETH,
  wrapETH,
  unwrapETH,
  swapUSDCToETHByAmbient,
  swapETHToUSDCByAmbient,
  addWETHToCogUSDCWETHCollateral,
  addWETHToCogDAIWETHCollateral,
  addWETHToCogCollateral,
  borrowUSDCFromCog,
  borrowDAIFromCog,
  borrowFromCog,
  repayUSDCToCog,
  repayDAIToCog,
  repayToCog,
  removeUSDCWETHCollateralFromCog,
  removeDAIWETHCollateralFromCog,
  removeCollateralFromCog,
  predictBorrowShareBase,
} from './utils'

const scrollChainID = 0x82750

// NOTE: following address only for Scroll chain
const usdcAddress = '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4'
const daiAddress = '0xcA77eB3fEFe3725Dc33bccB54eDEFc3D9f764f97'
const usdtAddress = '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df'
const wETHAddress = '0x5300000000000000000000000000000000000004'
// cog finnace lend address
const cogPairUSDCWETH = '0x63fdafa50c09c49f594f47ea7194b721291ec50f'
const cogPairDAIWETH = '0x43187A6052A4BF10912CDe2c2f94953e39FcE8c7'
const cogPairUSDTWETH = '0x4Ac126e5dd1Cd496203a7E703495cAa8112A20cA'

const ambientSwapAddress = '0xaaaaaaaacb71bf2c8cae522ea5fa455571a74106'

const approveWETHToCogPairUSDTWETH: (amount: bigint) => Tx = (amount) =>
  approveERC20({
    tokenAddress: wETHAddress,
    spenderAddress: cogPairUSDTWETH,
    amount: amount,
    name: 'Approve',
    description: 'WETH to Cog Finance',
    meta: {
      highlights: ['Cog Finance'],
    },
  })

const approveUSDTToCogPairUSDTWETH: (amount: bigint) => Tx = (amount) =>
  approveERC20({
    tokenAddress: usdtAddress,
    spenderAddress: cogPairUSDTWETH,
    amount: amount,
    name: 'Approve',
    description: 'USDT to Cog Finance',
    meta: {
      highlights: ['Cog Finance'],
    },
  })

const addWETHToCogUSDTWETHCollateral: (
  userAddress: `0x${string}`,
  amount: bigint
) => Tx = (userAddress, amount) =>
  addWETHToCogCollateral({
    userAddress,
    pairAddress: cogPairUSDTWETH,
    pair: 'USDT/WETH',
    amount,
  })

const borrowUSDTFromCog: (
  client: PublicClient,
  userAddress: `0x${string}`,
  amount: bigint
) => Promise<Tx> = (client, userAddress, amount) =>
  borrowFromCog({
    client,
    userAddress,
    pairAddress: cogPairUSDTWETH,
    tokenAddress: usdtAddress,
    amount,
    symbol: 'USDT',
    decimals: 6,
  })

const repayUSDTToCog: (amount: bigint) => Tx = (amount) =>
  repayToCog({
    pairAddress: cogPairUSDTWETH,
    amount: amount,
    symbol: 'USDT',
    pair: 'USDT/WETH',
    decimals: 6,
  })

const removeUSDTWETHCollateralFromCog: (
  amount: bigint,
  userAddress: `0x${string}`
) => Tx = (amount, userAddress) =>
  removeCollateralFromCog({
    pairAddress: cogPairUSDTWETH,
    userAddress,
    amount,
    stableTokenSymbol: 'USDT',
  })

const tags = [
  { title: TagTitle.Dex },
  { title: TagTitle.Swap },
  { title: TagTitle.Lending },
]

const scrollAirdropHuntingProfessional: BatchCase = {
  id: 'scroll_airdrop_hunting_professional',
  name: 'On-chain Interaction on Scroll: Professional',
  description:
    'Potential: ⭐⭐⭐⭐⭐ / Number of Contract Interacted: 9 / On-Chain Volume Boost: 13x / Click Saved: 21',
  details: BATCH_DETAILS,
  website: {
    title: 'Scroll',
    url: 'https://scroll.io/',
  },
  tags,
  curatorTwitter: {
    name: '@hank06171',
    url: 'https://twitter.com/hank06171',
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  networkId: scrollChainID,
  atomic: true,
  renderExpiry: 15,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'USDC Amount',
      inputType: InputType.ERC20Amount,
      description: 'Amount to swap, wrap, unwrap, lending and borrow',
      validate: decimalValidator(6, BigInt(0)),
      options: {
        token: usdcAddress,
      },
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
    const client: PublicClient = createPublicClient({
      chain: context.chain,
      transport: http(),
    })
    const inputUSDCAmount = parseUnits(inputs[0], 6)
    const userAddress = context.account.address as `0x${string}`

    let txs: Tx[] = []

    // --- Swap to ETH ---
    // 1
    txs.push(approveUSDCToAmbient(inputUSDCAmount))

    // 2
    const { tx: swapUSDCToETHTx, ethMinOut } =
      await swapUSDCToETHByAmbient(inputUSDCAmount)
    txs.push(swapUSDCToETHTx)

    // 3
    txs.push(wrapETH(ethMinOut))

    // --- Cog Finance (USDC/WETH) ---
    // 4
    txs.push(approveWETHToCogPairUSDCWETH(ethMinOut))

    // 5
    txs.push(addWETHToCogUSDCWETHCollateral(userAddress, ethMinOut))

    // 6
    const usdcBorrowAmount = inputUSDCAmount / BigInt(2)
    txs.push(await borrowUSDCFromCog(client, userAddress, usdcBorrowAmount))

    // 7
    txs.push(
      approveUSDCToCogPairUSDCWETH(
        (usdcBorrowAmount * BigInt(1001)) / BigInt(1000)
      )
    )

    // 8
    const repayUSDCAmount = await predictBorrowShareBase(
      client,
      cogPairUSDCWETH,
      usdcBorrowAmount,
      0.9992
    )
    txs.push(repayUSDCToCog(repayUSDCAmount))

    // 9
    const withdrawWETHAmountFromUSDCWETH =
      (ethMinOut * BigInt(999)) / BigInt(1000)
    txs.push(
      removeUSDCWETHCollateralFromCog(
        withdrawWETHAmountFromUSDCWETH,
        userAddress
      )
    )

    // --- Cog Finance (DAI/WETH) ---
    // 10
    txs.push(approveWETHToCogPairDAIWETH(withdrawWETHAmountFromUSDCWETH))

    // 11
    txs.push(
      addWETHToCogDAIWETHCollateral(userAddress, withdrawWETHAmountFromUSDCWETH)
    )

    // 12
    const daiBorrowAmount = usdcBorrowAmount * BigInt(10) ** BigInt(12)
    txs.push(await borrowDAIFromCog(client, userAddress, daiBorrowAmount))

    // 13
    txs.push(approveDAIToCogPairDAIWETH(daiBorrowAmount))

    // 14
    const repayDAIAmount = await predictBorrowShareBase(
      client,
      cogPairDAIWETH,
      daiBorrowAmount,
      0.9992
    )
    txs.push(repayDAIToCog(repayDAIAmount))

    // 15
    const withdrawWETHAmountFromDAIWETH =
      (withdrawWETHAmountFromUSDCWETH * BigInt(9992)) / BigInt(10000)
    txs.push(
      removeDAIWETHCollateralFromCog(withdrawWETHAmountFromDAIWETH, userAddress)
    )

    // --- Cog Finance (USDT/WETH) ---
    // 16
    txs.push(approveWETHToCogPairUSDTWETH(withdrawWETHAmountFromDAIWETH))

    // 17
    txs.push(
      addWETHToCogUSDTWETHCollateral(userAddress, withdrawWETHAmountFromDAIWETH)
    )

    // 18
    const usdtBorrowAmount = usdcBorrowAmount
    txs.push(await borrowUSDTFromCog(client, userAddress, usdtBorrowAmount))

    // 19
    txs.push(approveUSDTToCogPairUSDTWETH(usdtBorrowAmount))

    // 20
    const repayUSDTAmount = await predictBorrowShareBase(
      client,
      cogPairUSDTWETH,
      usdtBorrowAmount,
      0.9988
    )
    txs.push(repayUSDTToCog(repayUSDTAmount))

    // 21
    const withdrawWETHAmountFromUSDTWETH =
      (withdrawWETHAmountFromDAIWETH * BigInt(9988)) / BigInt(10000)
    txs.push(
      removeUSDTWETHCollateralFromCog(
        withdrawWETHAmountFromUSDTWETH,
        userAddress
      )
    )

    // --- Swap Back to ETH ---
    // 22
    txs.push(unwrapETH(withdrawWETHAmountFromUSDTWETH))

    // 23
    const { tx } = await swapETHToUSDCByAmbient(withdrawWETHAmountFromUSDTWETH)
    txs.push(tx)

    return txs
  },
  previewTx: [
    {
      name: 'Approve',
      description: 'USDC to Ambient',
      to: usdcAddress,
      meta: {
        highlights: ['Ambient'],
      },
    },
    {
      name: 'Swap',
      description: 'USDC to ETH on Ambient',
      to: ambientSwapAddress,
      meta: {
        highlights: ['Ambient'],
      },
    },
    {
      name: 'Wrap',
      description: 'ETH to WETH',
      to: wETHAddress,
    },
    {
      name: 'Approve',
      description: 'WETH to Cog Finance',
      to: wETHAddress,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: 'Add',
      description: `WETH as collateral to Cog Finance`,
      to: cogPairUSDCWETH,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: `Borrow`,
      description: `USDC in half of the collateral WETH from Cog Finance`,
      to: cogPairUSDCWETH,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: 'Approve',
      description: 'USDC to Cog Finance',
      to: usdcAddress,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: `Repay`,
      description: `USDC to Cog Finance`,
      to: cogPairUSDCWETH,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: 'Remove',
      description: `WETH Collateral (USDC) from Cog Finance`,
      to: cogPairUSDCWETH,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: 'Approve',
      description: 'WETH to Cog Finance',
      to: wETHAddress,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: 'Add',
      description: `WETH as collateral to Cog Finance`,
      to: cogPairDAIWETH,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: `Borrow`,
      description: `DAI in half of the collateral WETH from Cog Finance`,
      to: cogPairDAIWETH,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: 'Approve',
      description: 'DAI to Cog Finance',
      to: daiAddress,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: `Repay`,
      description: `DAI to Cog Finance`,
      to: cogPairDAIWETH,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: 'Remove',
      description: `WETH Collateral (DAI) from Cog Finance`,
      to: cogPairDAIWETH,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: 'Approve',
      description: 'WETH to Cog Finance',
      to: wETHAddress,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: 'Add',
      description: `WETH as collateral to Cog Finance`,
      to: cogPairUSDTWETH,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: `Borrow`,
      description: `USDT in half of the collateral WETH from Cog Finance`,
      to: cogPairUSDTWETH,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: 'Approve',
      description: 'USDT to Cog Finance',
      to: usdtAddress,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: `Repay`,
      description: `USDT to Cog Finance`,
      to: cogPairUSDTWETH,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: 'Remove',
      description: `WETH Collateral (DAI) from Cog Finance`,
      to: cogPairUSDTWETH,
      meta: {
        highlights: ['Cog Finance'],
      },
    },
    {
      name: 'Unwrap',
      description: 'WETH to ETH',
      to: wETHAddress,
    },
    {
      name: 'Swap',
      description: 'ETH to USDC on Ambient',
      to: ambientSwapAddress,
      meta: {
        highlights: ['Ambient'],
      },
    },
  ],
}

export default scrollAirdropHuntingProfessional
