import type { Abi } from 'abitype'
import {
  Context,
  BatchCase,
  InputType,
  Tag,
  Tx,
  WalletType,
} from '@/models/cases/v3/types'
import { balance, decimalValidator, max } from '@/models/cases/v3/utils'
import {
  createPublicClient,
  getContract,
  http,
  encodeFunctionData,
  parseUnits,
  formatUnits,
} from 'viem'
import USDT from './abi/USDT.json'
import USDe from './abi/USDe.json'
import UniswapRouterV3 from './abi/UniswapRouterV3.json'
import UniswapQuoterV3 from './abi/UniswapQuoterV3.json'
import EthenaLPStaking from './abi/EthenaLPStaking.json'

const usdtAddr = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const usdeAddr = '0x4c9edd5852cd905f086c759e8383e09bff1e68b3'
const uniswapQuoterAddr = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
const uniswapRouterAddr = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const ethenaLPStakingAddr = '0x8707f238936c12c309bfc2B9959C35828AcFc512'

const EthenaUSDT: BatchCase = {
  id: 'ethena_usdt',
  name: 'Stake USDe to collect interest',
  description: 'Swap USDT to USDe on Uniswap and stake to Ethena',
  website: {
    title: 'Ethena',
    url: 'https://app.ethena.fi/',
  },
  tags: ['DeFi', 'USDT', 'USDe', 'Points', 'Ethena', 'Uniswap'].map(
    (name) => ({ title: name }) as Tag
  ),
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
      name: 'USDT Amount',
      inputType: InputType.ERC20Amount,
      description: 'Amount to buy USDe',
      validate: decimalValidator(6, BigInt(1)),
      options: {
        token: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
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
    const txs: Tx[] = []

    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    })

    const usdt = getContract({
      address: usdtAddr,
      abi: USDT,
      client: client,
    })

    const usde = getContract({
      address: usdeAddr,
      abi: USDe,
      client: client,
    })

    const uniswapQuoter = getContract({
      address: uniswapQuoterAddr,
      abi: UniswapQuoterV3,
      client: client,
    })

    const uniswapRouter = getContract({
      address: uniswapRouterAddr,
      abi: UniswapRouterV3,
      client: client,
    })

    const ethenaLPStaking = getContract({
      address: ethenaLPStakingAddr,
      abi: EthenaLPStaking,
      client: client,
    })

    const usdtAllowance = (await usdt.read.allowance([
      context.account.address,
      uniswapRouter.address,
    ])) as bigint

    const usdtAmount = parseUnits(inputs[0], 6)

    if (usdtAmount > usdtAllowance) {
      txs.push({
        name: `Approve`,
        description: `${inputs[0]} USDT to Uniswap`,
        to: usdt.address,
        value: 0n,
        data: encodeFunctionData({
          abi: usdt.abi,
          functionName: 'approve',
          args: [uniswapRouter.address, usdtAmount],
        }),
        abi: usdt.abi as Abi,
        meta: {
          highlights: ['Uniswap'],
        },
      })
    }

    const usdeAmount = (await uniswapQuoter.read.quoteExactInputSingle([
      usdtAddr, // token in
      usdeAddr, // token out
      '100', // fee
      usdtAmount, // amount in
      '0', // sqrtPriceLimitX96
    ])) as bigint

    const usdeFormatAmount = formatUnits(usdeAmount, 18)

    txs.push({
      name: `Swap`,
      description: `${inputs[0]} USDT to ${usdeFormatAmount} USDe`,
      to: uniswapRouter.address,
      value: 0n,
      data: encodeFunctionData({
        abi: uniswapRouter.abi,
        functionName: 'exactInputSingle',
        args: [
          [
            usdtAddr, // token in
            usdeAddr, // token out
            '100', // fee
            context.account.address, // recipient
            Math.floor(Date.now() / 1000) + 300, // deadline
            usdtAmount, // amountIn
            usdeAmount, // amountOutMinimum
            '0', // sqrtPriceLimitX96
          ],
        ],
      }),
      abi: uniswapRouter.abi as Abi,
    })

    const usdeAllowance = (await usde.read.allowance([
      context.account.address,
      ethenaLPStaking.address,
    ])) as bigint

    if (usdeAmount > usdeAllowance) {
      txs.push({
        name: `Approve`,
        description: `${usdeFormatAmount} USDe to lock on Ethena`,
        to: usde.address,
        value: 0n,
        data: encodeFunctionData({
          abi: usde.abi,
          functionName: 'approve',
          args: [ethenaLPStaking.address, usdeAmount],
        }),
        abi: usde.abi as Abi,
        meta: {
          highlights: ['Ethena'],
        },
      })
    }

    txs.push({
      name: `Stake`,
      description: `${usdeFormatAmount} USDe on Ethena`,
      to: ethenaLPStaking.address,
      value: 0n,
      data: encodeFunctionData({
        abi: ethenaLPStaking.abi,
        functionName: 'stake',
        args: [usdeAddr, usdeAmount],
      }),
      abi: ethenaLPStaking.abi as Abi,
      meta: {
        highlights: ['Ethena'],
      },
    })

    return txs
  },
  previewTx: [
    {
      name: `Approve`,
      description: `USDT to Uniswap`,
      to: usdtAddr,
      meta: {
        highlights: ['Uniswap'],
      },
    },
    {
      name: `Swap`,
      description: `USDT to USDe`,
      to: uniswapRouterAddr,
    },
    {
      name: `Approve`,
      description: `USDe to lock on Ethena`,
      to: usdeAddr,
      meta: {
        highlights: ['Ethena'],
      },
    },
    {
      name: `Stake`,
      description: `USDe on Ethena`,
      to: ethenaLPStakingAddr,
      meta: {
        highlights: ['Ethena'],
      },
    },
  ],
  setActions(args) {
    return [
      {
        href: 'https://app.ethena.fi/join',
        text: 'Sats Campaign (Ethena)',
      },
      {
        href: 'https://app.ethena.fi/liquidity',
        text: 'Manage Position (Ethena)',
      },
    ]
  },
}

export default [EthenaUSDT]
