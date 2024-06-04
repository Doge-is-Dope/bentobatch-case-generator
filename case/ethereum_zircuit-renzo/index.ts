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
  encodeFunctionData,
  fromHex,
  getContract,
  http,
  parseUnits,
} from 'viem'
import RenzoRateProvider from './abi/RenzoRateProvider.json'
import RenzoRestakeManager from './abi/RenzoRestakeManager.json'
import ezETH from './abi/EZETH.json'
import ZircuitRestakingPool from './abi/ZircuitRestakingPool.json'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'

const renzoRestakeManagerAddr = '0x74a09653A083691711cF8215a6ab074BB4e99ef5'
const renzoRateProviderAddr = '0x387dBc0fB00b26fb085aa658527D5BE98302c84C'
const ezEthAddr = '0xbf5495Efe5DB9ce00f80364C8B423567e58d2110'
const zircuitRestakingPoolAddr = '0xF047ab4c75cebf0eB9ed34Ae2c186f3611aEAfa6'

const tags = [
  { title: TagTitle.Official },
  { title: TagTitle.Benefits },
  { title: TagTitle.Defi },
  { title: TagTitle.Restaking },
]

const zircuitRenzo: BatchCase = {
  id: 'zircuit_renzo',
  name: '🔥 Earn extra 15% Zircuit Points with Renzo Restaking by ETH',
  description:
    'Restake ETH on Renzo and deposit $ezETH to Zircuit in One Click.  Earn Staking APR + Restaking APR ＋Eigenlayer + Renzo + Zircuit + BENTO BOX with ETH in one Click',
  details: BATCH_DETAILS,
  website: {
    title: 'Zircuit',
    url: 'https://www.zircuit.com/',
  },
  tags,
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  networkId: 1,
  atomic: true,
  renderExpiry: undefined,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'ETH Amount',
      inputType: InputType.NativeAmount,
      description: 'Amount to stake to ezETH',
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

    const renzoRateProvider = getContract({
      address: renzoRateProviderAddr,
      abi: RenzoRateProvider,
      client: client,
    })

    const renzoRestakeManager = getContract({
      address: renzoRestakeManagerAddr,
      abi: RenzoRestakeManager,
      client: client,
    })

    const ezEth = getContract({
      address: ezEthAddr,
      abi: ezETH,
      client: client,
    })

    const zircuitRestakingPool = getContract({
      address: zircuitRestakingPoolAddr,
      abi: ZircuitRestakingPool,
      client: client,
    })

    const ethInputAmount = parseUnits(inputs[0], 18)
    // The current rate of ezETH in ETH
    const rate = (await renzoRateProvider.read.getRate()) as bigint
    const ezEthAmount = Number(ethInputAmount) / Number(rate)
    const ezEthAmountFormatted = ezEthAmount.toLocaleString('en-US', {
      maximumFractionDigits: 18,
    })
    const ezEthAmountBigInt = parseUnits(ezEthAmount.toFixed(18), 18)

    txs.push({
      name: 'Stake',
      description: `${inputs[0]} ETH to ${ezEthAmountFormatted} ezETH`,
      to: renzoRestakeManager.address,
      value: ethInputAmount,
      data: encodeFunctionData({
        abi: renzoRestakeManager.abi,
        functionName: 'depositETH',
        args: [fromHex('0x80011844928B469EAc5E4bC7e6EBA9b3C2Fa1b41', 'bigint')],
      }),
      abi: renzoRestakeManager.abi as Abi,
    })

    const ezEthAllowance = (await ezEth.read.allowance([
      context.account.address,
      zircuitRestakingPoolAddr,
    ])) as bigint

    if (ezEthAmountBigInt > ezEthAllowance) {
      txs.push({
        name: `Approve`,
        description: `${ezEthAmountFormatted} ezETH for Zircuit`,
        to: ezEth.address,
        value: 0n,
        data: encodeFunctionData({
          abi: ezEth.abi,
          functionName: 'approve',
          args: [zircuitRestakingPoolAddr, ezEthAmountBigInt],
        }),
        abi: ezEth.abi as Abi,
        meta: {
          highlights: ['Zircuit'],
        },
      })
    }

    txs.push({
      name: `Stake`,
      description: `${ezEthAmountFormatted} ezETH to Zircuit`,
      to: zircuitRestakingPool.address,
      value: 0n,
      data: encodeFunctionData({
        abi: zircuitRestakingPool.abi,
        functionName: 'depositFor',
        args: [ezEthAddr, context.account.address, ezEthAmountBigInt],
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
      description: 'ETH to ezETH',
      to: renzoRestakeManagerAddr,
    },
    {
      name: 'Approve',
      description: 'ezETH for Zircuit',
      to: ezEthAddr,
      meta: {
        highlights: ['Zircuit'],
      },
    },
    {
      name: 'Stake',
      description: 'ezETH to Zircuit',
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
        href: 'https://app.renzoprotocol.com/portfolio',
        text: 'Check Portfolio (Renzo)',
      },
    ]
  },
}

export default [zircuitRenzo]
