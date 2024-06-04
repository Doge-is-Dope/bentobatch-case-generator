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
  getContract,
  formatEther,
  createPublicClient,
  encodeFunctionData,
  numberToHex,
  pad,
  parseUnits,
  http,
} from 'viem'
import { calculateUniswapParams } from './utils/uniswapUtils'
import GenesisRestakingPoolAbi from './abi/GenesisRestakingPool.json'
import UniswapV3PositionAbi from './abi/UniswapV3Position.json'
import UniswapV3PoolAbi from './abi/UniswapV3Pool.json'
import stETHAbi from './abi/stETH.json'
import wstETHAbi from './abi/wstETH.json'
import genETHAbi from './abi/genETH.json'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'

// Addresses
const stETHAddr = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' //Lido: stETH
const wstETHAddr = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0' // Lido: wstETH
const genETHAddr = '0xf073bAC22DAb7FaF4a3Dd6c6189a70D54110525C' // GenesisLRT: genETH
const genesisRestakingPoolAddr = '0x46199caa0e453971cedf97f926368d9e5415831a' // GenesisLRT: restaking pool

const uniswapV3PositionAddr = '0xc36442b4a4522e871399cd717abdd847ab11fe88' // UniswapV3: Position
const UniswapV3WstETHGenETHAddr = '0x3c0a1a9e0e22b9acc9248d9f358286e9e9205b0a' // UniswapV3: wstETH / genETH

const tags = [
  { title: TagTitle.Official },
  { title: TagTitle.Benefits },
  { title: TagTitle.Defi },
  { title: TagTitle.Restaking },
  { title: TagTitle.Liquidity },
]

const genesis: BatchCase = {
  id: 'genesis_liquidity',
  name: '🔥 Earn extra 20% GenesisLRT restaking points and get x15 Gems boost',
  description:
    'Restake ETH on GenesisLRT and Lido. Plus, provide liquidity on Uniswap to receive a 15x GenesisLRT Gems boost with One-Click!',
  details: BATCH_DETAILS,
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  website: {
    title: 'Genesis',
    url: 'https://www.genesislrt.com/app/defi',
  },
  tags,
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  networkId: 1,
  atomic: true,
  renderExpiry: 15,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'ETH Amount (min 0.0000000000000001 ETH)',
      inputType: InputType.NativeAmount,
      description: 'Amount to deposit',
      validate: decimalValidator(18, 100n),
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
    const txs: Tx[] = []
    const ethInputAmount = parseUnits(inputs[0], 18)
    const eth = 10n ** 18n

    // Config
    const referer = '0x80011844928B469EAc5E4bC7e6EBA9b3C2Fa1b41' // Bento Batch referer

    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    })

    const genesisRestaking = getContract({
      address: genesisRestakingPoolAddr,
      abi: GenesisRestakingPoolAbi,
      client: client,
    })

    const uniswapPool = getContract({
      address: UniswapV3WstETHGenETHAddr,
      abi: UniswapV3PoolAbi,
      client: client,
    })

    const stETH = getContract({
      address: stETHAddr,
      abi: stETHAbi,
      client: client,
    })

    const wstETH = getContract({
      address: wstETHAddr,
      abi: wstETHAbi,
      client: client,
    })

    const genETH = getContract({
      address: genETHAddr,
      abi: genETHAbi,
      client: client,
    })

    // Get current pool price
    const { result: poolSlot0 } = await uniswapPool.simulate.slot0()
    const sqrtPriceX96 = poolSlot0[0]
    const { result: tickSpacing } = await uniswapPool.simulate.tickSpacing()
    // Calculate Uniswap params for the first time just to get the ratio of genETH and wstETH
    const dummpyUniswapParams = calculateUniswapParams({
      tickSpacing,
      sqrtPriceX96,
      inputAmount: eth,
    })
    // amount0: wstETH, amount1: genETH
    const { amount0: dummyAmount0, amount1: dummyAmount1 } = dummpyUniswapParams

    // Get Ratio of ETH to genETH
    const { result: dummyOutputGenETH }: { result: bigint } =
      await genETH.simulate.convertToShares([eth])
    // In order to keep the accuracy of the ratio, we multiply the result by 10^18
    const ethToGenETHRatio = (dummyOutputGenETH * 10n ** 18n) / eth
    const { result: dummyOutputWstETH }: { result: bigint } =
      await wstETH.simulate.getWstETHByStETH([eth])
    const stETHToWstETHRatio = (dummyOutputWstETH * 10n ** 18n) / eth

    // Solved the equation for the amount of ETH to be staked with Genesis
    const ethForGenETH =
      (BigInt(Math.floor(dummyAmount1)) * ethInputAmount * stETHToWstETHRatio) /
      (ethToGenETHRatio * BigInt(Math.floor(dummyAmount0)) +
        stETHToWstETHRatio * BigInt(Math.floor(dummyAmount1)))
    const { result: genETHAmount }: { result: bigint } =
      await genETH.simulate.convertToShares([ethForGenETH])

    const stakeToGenesis = async (): Promise<Tx[]> => {
      const genesisTxs: Tx[] = []
      // 1. Stake ETH with Genesis with referer code
      genesisTxs.push({
        name: 'Stake',
        description: `${formatEther(
          ethForGenETH
        )} ETH and receive ${formatEther(genETHAmount)} genETH on Genesis`,
        to: genesisRestaking.address,
        value: ethForGenETH,
        data: encodeFunctionData({
          abi: genesisRestaking.abi,
          functionName: 'stake',
          args: [pad(referer)],
        }),
        abi: genesisRestaking.abi as Abi,
        meta: {
          highlights: ['Genesis'],
        },
      })

      // Check if the user has approved the genETH to be added to the liquidity pool
      const { result: genETHDepositAllowance } =
        await genETH.simulate.allowance([
          context.account.address,
          uniswapV3PositionAddr,
        ])
      // 2. Approve genETH to be added to the liquidity pool
      if (genETHDepositAllowance < genETHAmount) {
        genesisTxs.push({
          name: 'Approve',
          description: `${formatEther(
            genETHAmount
          )} genETH to be added to the UniswapV3 liquidity pool`,
          to: genETHAddr,
          value: 0n,
          data: encodeFunctionData({
            abi: genETH.abi,
            functionName: 'approve',
            args: [uniswapV3PositionAddr, genETHAmount],
          }),
          abi: genETH.abi as Abi,
          meta: {
            highlights: ['UniswapV3'],
          },
        })
      }
      return genesisTxs
    }

    const ethForStETH = ethInputAmount - ethForGenETH
    const stETHAmount = ethForStETH
    const { result: wstETHAmount }: { result: bigint } =
      await wstETH.simulate.getWstETHByStETH([stETHAmount])

    const stakeToLido = async (): Promise<Tx[]> => {
      const lidoTxs: Tx[] = []
      // 3. Stake ETH with Lido with referer address
      lidoTxs.push({
        name: 'Stake',
        description: `${formatEther(
          ethForStETH
        )} ETH and receive ${formatEther(ethForStETH)} stETH on Lido`,
        to: stETH.address,
        value: ethForStETH,
        data: encodeFunctionData({
          abi: stETH.abi,
          functionName: 'submit',
          args: [referer],
        }),
        abi: stETH.abi as Abi,
        meta: {
          highlights: ['Lido'],
        },
      })

      // Check if the user has approved the stETH to be wrapped
      const { result: stETHWrapAllowance } = await stETH.simulate.allowance([
        context.account.address,
        wstETHAddr,
      ])

      // 4. Approve stETH to be wrapped if haven't done so
      if (stETHWrapAllowance < ethForStETH) {
        lidoTxs.push({
          name: 'Approve',
          description: `${formatEther(stETHAmount)} stETH to be wrapped`,
          to: stETHAddr,
          value: 0n,
          data: encodeFunctionData({
            abi: stETH.abi,
            functionName: 'approve',
            args: [wstETHAddr, stETHAmount],
          }),
          abi: stETH.abi as Abi,
        })
      }

      // 5. Wrap stETH to wstETH
      lidoTxs.push({
        name: 'Wrap',
        description: `received ${formatEther(
          stETHAmount
        )} stETH to ${formatEther(wstETHAmount)} wstETH`,
        to: wstETHAddr,
        value: 0n,
        data: encodeFunctionData({
          abi: wstETH.abi,
          functionName: 'wrap',
          args: [stETHAmount],
        }),
        abi: wstETH.abi as Abi,
      })

      // Check if the user has approved the wstETH to be added to the liquidity pool
      const { result: wstETHDepositAllowance } =
        await wstETH.simulate.allowance([
          context.account.address,
          uniswapV3PositionAddr,
        ])

      // 6. Approve wstETH to be added to the liquidity pool
      if (wstETHDepositAllowance < wstETHAmount) {
        lidoTxs.push({
          name: 'Approve',
          description: `wstETH to be added to the UniswapV3 liquidity pool`,
          to: wstETHAddr,
          value: 0n,
          data: encodeFunctionData({
            abi: wstETH.abi,
            functionName: 'approve',
            args: [uniswapV3PositionAddr, wstETHAmount],
          }),
          abi: wstETH.abi as Abi,
          meta: {
            highlights: ['UniswapV3'],
          },
        })
      }
      return lidoTxs
    }

    const [genesisTxs, lidoTxs] = await Promise.all([
      stakeToGenesis(),
      stakeToLido(),
    ])
    txs.push(...genesisTxs, ...lidoTxs)

    const uniswapParams = calculateUniswapParams({
      tickSpacing,
      sqrtPriceX96,
      inputAmount: eth,
    })
    // amount0: wstETH, amount1: genETH
    const { tickLower, tickUpper } = uniswapParams

    const recipient = context.account.address // Recipient of liquidity pool tokens
    const deadline = numberToHex(Date.now() + 1000 * 60 * 10) // 10 minutes

    const data = encodeFunctionData({
      abi: UniswapV3PositionAbi,
      functionName: 'mint',
      args: [
        {
          token0: wstETH.address,
          token1: genETH.address,
          fee: 500,
          tickLower: tickLower,
          tickUpper: tickUpper,
          amount0Desired: wstETHAmount,
          amount1Desired: genETHAmount,
          amount0Min: 0, // max slippage from the uniswap interface set to auto will be 0
          amount1Min: 0, // max slippage from the uniswap interface set to auto will be 0
          recipient,
          deadline,
        },
      ],
    })

    // 7. Add wstETH and genETH to the UniswapV3 liquidity pool
    txs.push({
      name: 'Add',
      description: `${formatEther(wstETHAmount)} wstETH and ${formatEther(
        genETHAmount
      )} genETH to the UniswapV3 liquidity pool`,
      to: uniswapV3PositionAddr,
      value: 0n,
      data,
      abi: UniswapV3PositionAbi as Abi,
      meta: {
        highlights: ['UniswapV3'],
      },
    })

    return txs
  },
  previewTx: [
    {
      name: 'Stake',
      description: 'ETH and receive genETH on Genesis',
      to: genesisRestakingPoolAddr,
      meta: {
        highlights: ['Genesis'],
      },
    },
    {
      name: 'Approve',
      description: 'genETH to be added to the UniswapV3 liquidity pool',
      to: genETHAddr,
      meta: {
        highlights: ['UniswapV3'],
      },
    },
    {
      name: 'Stake',
      description: 'ETH and receive stETH on Lido',
      to: genETHAddr,
      meta: {
        highlights: ['Lido'],
      },
    },
    {
      name: 'Stake',
      description: 'stETH to be wrapped',
      to: stETHAddr,
    },
    {
      name: 'Wrap',
      description: 'received stETH to wstETH',
      to: stETHAddr,
    },
    {
      name: 'Approve',
      description: 'wstETH to be added to the UniswapV3 liquidity pool',
      to: wstETHAddr,
      meta: {
        highlights: ['UniswapV3'],
      },
    },
    {
      name: 'Add',
      description: 'wstETH and genETH to the UniswapV3 liquidity pool',
      to: uniswapV3PositionAddr,
      meta: {
        highlights: ['UniswapV3'],
      },
    },
  ],
  setActions: () => {
    return [
      {
        href: 'https://www.genesislrt.com/app/dashboard/',
        text: 'Check Points (GenesisLRT)',
      },
    ]
  },
}

export default [genesis]
