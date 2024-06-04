import type { Abi } from 'abitype'
import {
  Context,
  BatchCase,
  InputType,
  Tag,
  Tx,
  TagTitle,
  ActionsArgs,
  WalletType,
} from '@/models/cases/v3/types'
import {
  balance,
  decimalValidator,
  getDecimals,
  max,
} from '@/models/cases/v3/utils'
import {
  createPublicClient,
  getContract,
  encodeFunctionData,
  parseUnits,
  http,
  formatEther,
  formatUnits,
} from 'viem'
import { base } from 'viem/chains'
import { AddressNotFoundError } from '../error'
import { getSrcTokenAmount, swapPreviewTx, swapTx } from '../prebuilt-tx/1inch'

import WETH from './abi/WETH.json'
import DEGEN from './abi/DEGEN.json'
import AerodromeRouter from './abi/AerodromeRouter.json'
import vAMMWETHDEGEN from './abi/vAMMWETHDEGEN.json'
import AerodromeGauge from './abi/AerodromeGauge.json'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'

// adresses on Base
const ethAddr = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const wETHAddr = '0x4200000000000000000000000000000000000006'
const degenAddr = '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed'
const aerodromeRouterAddr = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43'
const vAMMWETHDEGENAddr = '0x2C4909355b0C036840819484c3A882A95659aBf3'
const aerodromeGaugeAddr = '0x86a1260ab9f758026ce1a5830bdff66dbcf736d5'

const tags: Tag[] = [{ title: TagTitle.Defi }, { title: TagTitle.Liquidity }]

const aerodromeDegenLiquidity: BatchCase = {
  id: 'aerodrome_degen_liquidity',
  name: 'Farm vAMM-WETH/DEGEN LP on Aerodrome',
  description:
    'Wrap ETH and provide $WETH/$DEGEN liquidity on Aerodrome in One Click',
  details: BATCH_DETAILS,
  website: {
    title: 'Aerodrome',
    url: 'https://aerodrome.finance/liquidity',
  },
  tags,
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  networkId: 8453,
  atomic: true,
  renderExpiry: undefined,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'ETH Amount',
      inputType: InputType.NativeAmount,
      description: 'Amount desired to provide liquidity',
      validate: decimalValidator(18, BigInt(0)),
      actionContent: balance,
      actionButtons: [max],
    },
  ],
  render: async (context: Context) => {
    const userAddress = context.account.address
    if (!userAddress) throw new AddressNotFoundError()

    /*
    WARNING: when inputs are configured with an input that includes `isOptional: true`,
    make sure to handle the case where the correspond value in inputs may be undefined
    `context.inputs as string[]` only suitable for inputs that are not configured with `isOptional: true`
    */
    const inputs = context.inputs as string[]
    const inputETHAmount = parseUnits(inputs[0], 18)

    // simulate add liqudity to estimate the amount of ETH to deposit
    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    })
    const aerodromeRouter = getContract({
      address: aerodromeRouterAddr,
      abi: AerodromeRouter,
      client: client,
    })
    const { result: factoryAddr } =
      await aerodromeRouter.simulate.defaultFactory([], { value: 0n })
    // Use 49.7% of the input ETH amount to get the required amount of DEGEN for providing liquidity
    const ethDesiredAmount = (inputETHAmount * 497n) / 1000n
    // Use a large amount to ensure ethDesiredAmount equals ethAmountToDeposit and get the required amount of DEGEN
    const degenDesiredAmount = 999999999999999999999999999n
    const { result: quotes } = await aerodromeRouter.simulate.quoteAddLiquidity(
      [
        wETHAddr, // tokenA
        degenAddr, // tokenB
        false, // stable
        factoryAddr, // _factory
        ethDesiredAmount, // amountDesiredA
        degenDesiredAmount, // amountDesiredB
      ],
      { value: 0n }
    )
    const ethAmountToDeposit = quotes[0]
    const degenAmountToDeposit = quotes[1]
    const estimatedLiquidity = quotes[2]

    const ethAmountToSwap = await getSrcTokenAmount({
      chainId: context.chain.id,
      srcTokenAddress: ethAddr,
      dstAmount: degenAmountToDeposit,
      dstTokenAddress: degenAddr,
      buffer: 0.005,
    })

    let txs: Tx[] = []

    // Swap from ETH to DEGEN
    const { tx } = await swapTx({
      chainId: context.chain.id,
      userAddress: userAddress,
      srcTokenAddress: ethAddr,
      srcTokenSymbol: 'ETH',
      srcTokenDecimals: 18,
      srcAmount: ethAmountToSwap,
      dstTokenAddress: degenAddr,
      dstTokenSymbol: 'DEGEN',
      dstTokenDecimals: 18,
    })
    txs.push(tx)

    // wrap ETH
    txs.push({
      name: 'Wrap',
      description: `${formatEther(ethAmountToDeposit)} ETH to WETH`,
      to: wETHAddr,
      value: ethAmountToDeposit,
      data: encodeFunctionData({
        abi: WETH,
        functionName: 'deposit',
      }),
      abi: WETH as Abi,
    })

    // approve WETH
    txs.push({
      name: 'Approve',
      description: `${formatEther(ethAmountToDeposit)} WETH for providing liquidity`,
      to: wETHAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: WETH,
        functionName: 'approve',
        args: [
          aerodromeRouterAddr, // guy
          ethAmountToDeposit, // wad
        ],
      }),
      abi: WETH as Abi,
    })

    const degenDecimals = await getDecimals(degenAddr, context.chain)

    // approve DEGEN
    txs.push({
      name: 'Approve',
      description: `${formatUnits(degenAmountToDeposit, degenDecimals)} DEGEN for providing liquidity`,
      to: degenAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: DEGEN,
        functionName: 'approve',
        args: [
          aerodromeRouterAddr, // spender
          degenAmountToDeposit, // value
        ],
      }),
      abi: DEGEN as Abi,
    })

    // add WETH and DEGEN liqudity
    const currentTimeStamp = Math.floor(Date.now() / 1000)
    const deadline = currentTimeStamp + 60 * 3
    txs.push({
      name: 'Provide',
      description: `${formatEther(ethAmountToDeposit)} WETH and ${formatUnits(degenAmountToDeposit, degenDecimals)} DEGEN liquidity on Aerodrome`,
      to: aerodromeRouterAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: AerodromeRouter,
        functionName: 'addLiquidity',
        args: [
          wETHAddr, // tokenA
          degenAddr, // tokenB
          false, // stable
          ethAmountToDeposit, // amountADesired
          degenAmountToDeposit, // amountBDesired
          (ethAmountToDeposit * BigInt(992)) / BigInt(1000), // amountAMin
          (degenAmountToDeposit * BigInt(992)) / BigInt(1000), // aountBMin
          context.account.address, // to
          deadline, // deadline
        ],
      }),
      abi: AerodromeRouter as Abi,
      meta: {
        highlights: ['Aerodrome'],
      },
    })

    const vAMMWETHDEGENDecimals = await getDecimals(
      vAMMWETHDEGENAddr,
      context.chain
    )
    // approve vAMMWETHDEGENAddr
    txs.push({
      name: 'Approve',
      description: `${formatUnits(estimatedLiquidity, vAMMWETHDEGENDecimals)} LP Token(vAMM-WETH/DEGEN) for farming`,
      to: vAMMWETHDEGENAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: vAMMWETHDEGEN,
        functionName: 'approve',
        args: [
          aerodromeGaugeAddr, // spender
          estimatedLiquidity, // amount
        ],
      }),
      abi: vAMMWETHDEGEN as Abi,
    })

    // deposit LP token
    const lpTokenAmount = (estimatedLiquidity * BigInt(998)) / BigInt(1000)
    txs.push({
      name: 'Deposit',
      description: `${formatUnits(lpTokenAmount, vAMMWETHDEGENDecimals)} LP token(vAMM-WETH/DEGEN) and start farming`,
      to: aerodromeGaugeAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: AerodromeGauge,
        functionName: 'deposit',
        args: [lpTokenAmount],
      }),
      abi: AerodromeGauge as Abi,
    })

    return txs
  },
  previewTx: [
    swapPreviewTx({
      chainId: base.id,
      srcTokenSymbol: 'ETH',
      dstTokenSymbol: 'DEGEN',
    }),
    {
      name: 'Wrap',
      description: 'ETH to WETH',
      to: wETHAddr,
    },
    {
      name: 'Approve',
      description: 'WETH for providing liquidity',
      to: wETHAddr,
    },
    {
      name: 'Approve',
      description: 'DEGEN for providing liquidity',
      to: degenAddr,
    },
    {
      name: 'Provide',
      description: 'WETH and DEGEN liquidity on Aerodrome',
      to: aerodromeRouterAddr,
      meta: {
        highlights: ['Aerodrome'],
      },
    },
    {
      name: 'Approve',
      description: 'LP Token(vAMM-WETH/DEGEN) for farming',
      to: vAMMWETHDEGENAddr,
    },
    {
      name: 'Deposit',
      description: 'LP token(vAMM-WETH/DEGEN) and start farming',
      to: aerodromeGaugeAddr,
    },
  ],
  setActions: (args: ActionsArgs) => {
    return [
      {
        href: 'https://aerodrome.finance/liquidity',
        text: 'Manage Position (Aerodrome)',
      },
    ]
  },
}

export default [aerodromeDegenLiquidity]
