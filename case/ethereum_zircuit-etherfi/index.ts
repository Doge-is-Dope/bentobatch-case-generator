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
  encodeFunctionData,
  formatUnits,
  getContract,
  http,
  parseUnits,
} from 'viem'
import EtherfiLiquidityPool from './abi/EtherfiLiquidityPool.json'
import ZircuitRestakingPool from './abi/ZircuitRestakingPool.json'
import eETH from './abi/eETH.json'
import weETH from './abi/weETH.json'

const etherfiLiquidityPoolAddr = '0x308861A430be4cce5502d0A12724771Fc6DaF216'
const eEthAddr = '0x35fA164735182de50811E8e2E824cFb9B6118ac2'
const weEthAddr = '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee'
const zircuitRestakingPoolAddr = '0xF047ab4c75cebf0eB9ed34Ae2c186f3611aEAfa6'

const zircuitEtherfi: BatchCase = {
  id: 'zircuit_etherfi',
  name: 'Earn Points on Zircuit and EtherFi',
  description:
    'Stake ETH to EtherFi and Zircuit to earn Zircuit points, EtherFi loyalty points and EigenLayer Points',
  website: {
    title: 'Zircuit',
    url: 'https://www.zircuit.com/',
  },
  tags: ['DeFi', 'ETH', 'weETH', 'Points', 'EtherFi'].map(
    (name) => ({ title: name }) as Tag
  ),
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  networkId: 1,
  atomic: true,
  renderExpiry: undefined,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'ETH Amount',
      inputType: InputType.NativeAmount,
      description: 'Amount to stake to eETH',
      validate: decimalValidator(18, BigInt(0)),
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

    const etherfiLiquidityPool = getContract({
      address: etherfiLiquidityPoolAddr,
      abi: EtherfiLiquidityPool,
      client: client,
    })

    const eEth = getContract({
      address: eEthAddr,
      abi: eETH,
      client: client,
    })

    const weEth = getContract({
      address: weEthAddr,
      abi: weETH,
      client: client,
    })

    const zircuitRestakingPool = getContract({
      address: zircuitRestakingPoolAddr,
      abi: ZircuitRestakingPool,
      client: client,
    })

    const ethInputAmount = parseUnits(inputs[0], 18)
    // Cost 1 wei for staking ETH to eETH
    const eEthAmount = ethInputAmount - 1n
    const eEthAmountFormatted = formatUnits(eEthAmount, 18)

    txs.push({
      name: 'Stake',
      description: `${inputs[0]} ETH to ${eEthAmountFormatted} eETH`,
      to: etherfiLiquidityPool.address,
      value: ethInputAmount,
      data: encodeFunctionData({
        abi: etherfiLiquidityPool.abi,
        functionName: 'deposit',
        args: ['0x80011844928B469EAc5E4bC7e6EBA9b3C2Fa1b41'],
      }),
      abi: etherfiLiquidityPool.abi as Abi,
    })

    const eEthAllowance = (await eEth.read.allowance([
      context.account.address,
      weEthAddr,
    ])) as bigint

    if (eEthAmount > eEthAllowance) {
      txs.push({
        name: `Approve`,
        description: `${eEthAmountFormatted} eETH for wrapping as weETH`,
        to: eEth.address,
        value: 0n,
        data: encodeFunctionData({
          abi: eEth.abi,
          functionName: 'approve',
          args: [weEthAddr, eEthAmount],
        }),
        abi: eEth.abi as Abi,
      })
    }

    const weEthAmount = (await weEth.read.getWeETHByeETH([
      eEthAmount,
    ])) as bigint
    const weEthAmountFormatted = formatUnits(weEthAmount, 18)

    txs.push({
      name: `Wrap`,
      description: `${eEthAmountFormatted} eETH to ${weEthAmountFormatted} weETH`,
      to: weEth.address,
      value: 0n,
      data: encodeFunctionData({
        abi: weEth.abi,
        functionName: 'wrap',
        args: [eEthAmount],
      }),
      abi: weEth.abi as Abi,
    })

    const weEthAllowance = (await weEth.read.allowance([
      context.account.address,
      zircuitRestakingPoolAddr,
    ])) as bigint

    if (weEthAmount > weEthAllowance) {
      txs.push({
        name: `Approve`,
        description: `${weEthAmountFormatted} weETH to Zircuit`,
        to: weEth.address,
        value: 0n,
        data: encodeFunctionData({
          abi: weEth.abi,
          functionName: 'approve',
          args: [zircuitRestakingPoolAddr, weEthAmount],
        }),
        abi: weEth.abi as Abi,
        meta: {
          highlights: ['Zircuit'],
        },
      })
    }

    txs.push({
      name: `Stake`,
      description: `${weEthAmountFormatted} weETH to Zircuit`,
      to: zircuitRestakingPool.address,
      value: 0n,
      data: encodeFunctionData({
        abi: zircuitRestakingPool.abi,
        functionName: 'depositFor',
        args: [weEthAddr, context.account.address, weEthAmount],
      }),
      abi: zircuitRestakingPool.abi as Abi,
      meta: {
        highlights: ['Zircuit'],
      },
    })

    return txs
  },
  previewTx: [
    {
      name: 'Stake',
      description: 'ETH to eETH',
      to: etherfiLiquidityPoolAddr,
    },
    {
      name: 'Approve',
      description: 'eETH for wrapping as weETH',
      to: eEthAddr,
    },
    {
      name: 'Wrap',
      description: 'eETH to weETH',
      to: weEthAddr,
    },
    {
      name: 'Approve',
      description: 'weETH to Zircuit',
      to: weEthAddr,
      meta: {
        highlights: ['Zircuit'],
      },
    },
    {
      name: 'Stake',
      description: 'weETH to Zircuit',
      to: zircuitRestakingPoolAddr,
      meta: {
        highlights: ['Zircuit'],
      },
    },
  ],
  setActions: () => {
    return [
      {
        href: 'https://stake.zircuit.com/?ref=BENTOZ',
        text: 'Check Points (Zircuit)',
      },
      {
        href: 'https://app.ether.fi/portfolio',
        text: 'Check Portfolio (Etherfi))',
      },
    ]
  },
}

export default [zircuitEtherfi]
