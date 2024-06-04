import type { Abi } from 'abitype'
import {
  Context,
  BatchCase,
  Tx,
  InputType,
  TagTitle,
  WalletType,
} from '@/cases/types'
import { balance, decimalValidator, max } from '@/models/cases/v3/utils'
import {
  getContract,
  formatEther,
  createPublicClient,
  encodeFunctionData,
  toHex,
  pad,
  parseUnits,
  http,
} from 'viem'
import WETH from './abi/WETH.json'
import JuiceVault from './abi/JuiceVault.json'
import JuiceAccount from './abi/JuiceAccount.json'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'

// Addresses
const wETHAddr = '0x4300000000000000000000000000000000000004'
const juiceVaultAddr = '0x23eBa06981B5c2a6f1a985BdCE41BD64D18e6dFA' // juice finance wETH collateral vault
const juiceThrusterV3StrategyAddr = '0x741011f52B7499ca951f8b8Ee547DD3Cdd813Fda'

const tags = [{ title: TagTitle.Defi }, { title: TagTitle.Restaking }]

const juice: BatchCase = {
  id: 'juice_points',
  name: 'Earn Juice Finance Points on Blast with ETH',
  description:
    'With Juice Finance and bentobatch, we can earn Blast + Eigen Layer + Renzo + Juice + Thruster Points with ETH in One-Click',
  details: BATCH_DETAILS,
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  website: {
    title: 'Juice',
    url: 'https://www.juice.finance/',
  },
  tags,
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  networkId: 81457,
  atomic: true,
  renderExpiry: undefined,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'ETH Amount',
      inputType: InputType.NativeAmount,
      description: 'Amount to deposit',
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
    let txs: Tx[] = []
    const ethInputAmount = parseUnits(inputs[0], 18)

    // Config
    // @ts-ignore-next-line
    const borrowRate = 200n // borrow rate. 297% is the safe limit.
    // @ts-ignore-next-line
    const slippage = 96n // uniswap slippage for min out amount

    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    })

    const wETH = getContract({
      address: wETHAddr,
      abi: WETH,
      client: client,
    })

    const juiceVault = getContract({
      address: juiceVaultAddr,
      abi: JuiceVault,
      client: client,
    })

    // Wrap ETH
    txs.push({
      name: 'Wrap',
      description: `${inputs[0]} ETH to wETH`,
      to: wETH.address,
      value: ethInputAmount,
      data: encodeFunctionData({
        abi: wETH.abi,
        functionName: 'deposit',
      }),
      abi: wETH.abi as Abi,
    })

    // Check if account has created
    const { result: juiceAccountAddr } = await juiceVault.simulate.getAccount([
      context.account.address,
    ])

    const isUncreated =
      (await client.getBytecode({
        address: juiceAccountAddr,
      })) === undefined

    // Create account if uncreated
    if (isUncreated) {
      txs.push({
        name: 'Create',
        description: 'Account on Juice',
        to: juiceVault.address,
        // @ts-ignore-next-line
        value: 0n,
        data: encodeFunctionData({
          abi: juiceVault.abi,
          functionName: 'createAccount',
          args: undefined,
        }),
        abi: juiceVault.abi as Abi,
        meta: {
          highlights: ['Juice'],
        },
      })
    }

    // Approve wETH
    txs.push({
      name: 'Approve',
      description: `${inputs[0]} wETH for Juice`,
      to: wETH.address,
      // @ts-ignore-next-line
      value: 0n,
      data: encodeFunctionData({
        abi: wETH.abi,
        functionName: 'approve',
        args: [juiceVault.address, ethInputAmount],
      }),
      abi: wETH.abi as Abi,
      meta: {
        highlights: ['Juice'],
      },
    })

    // Deposit wETH
    txs.push({
      name: 'Deposit',
      description: `${inputs[0]} wETH to Juice`,
      to: juiceVault.address,
      // @ts-ignore-next-line
      value: 0n,
      data: encodeFunctionData({
        abi: juiceVault.abi,
        functionName: 'deposit',
        args: [ethInputAmount, context.account.address],
      }),
      abi: juiceVault.abi as Abi,
      meta: {
        highlights: ['Juice'],
      },
    })

    // Borrow wETH
    // @ts-ignore-next-line
    const borrowAmount = (ethInputAmount * borrowRate) / 100n
    txs.push({
      name: 'Borrow',
      description: `${borrowRate}% wETH from Juice`,
      to: juiceAccountAddr,
      // @ts-ignore-next-line
      value: 0n,
      data: encodeFunctionData({
        abi: JuiceAccount,
        functionName: 'borrow',
        args: [borrowAmount],
      }),
      abi: JuiceAccount as Abi,
      meta: {
        highlights: ['Juice'],
      },
    })

    // Deposit wETH to Juice ezETH Spot Long vault (Thruster V3 Strategy)
    // https://app.juice.finance/vaults/0x741011f52B7499ca951f8b8Ee547DD3Cdd813Fda
    // @ts-ignore-next-line
    const minOutAmount = (borrowAmount * slippage) / 100n
    txs.push({
      name: 'Deposit',
      description: `${formatEther(borrowAmount)} wETH to ezETH Spot Long vault on Juice`,
      to: juiceAccountAddr,
      // @ts-ignore-next-line
      value: 0n,
      data: encodeFunctionData({
        abi: JuiceAccount,
        functionName: 'strategyDeposit',
        args: [
          juiceThrusterV3StrategyAddr,
          borrowAmount,
          pad(toHex(minOutAmount)),
        ],
      }),
      abi: JuiceAccount as Abi,
      meta: {
        highlights: ['Juice'],
      },
    })

    return txs
  },
  previewTx: [
    {
      name: 'Wrap',
      description: 'ETH to wETH',
      to: wETHAddr,
    },
    {
      name: 'Create',
      description: 'Account on Juice',
      to: juiceVaultAddr,
      meta: {
        highlights: ['Juice'],
      },
    },
    {
      name: 'Approve',
      description: 'wETH for Juice',
      to: wETHAddr,
      meta: {
        highlights: ['Juice'],
      },
    },
    {
      name: 'Deposit',
      description: 'wETH to Juice',
      to: juiceVaultAddr,
      meta: {
        highlights: ['Juice'],
      },
    },
    {
      name: 'Borrow',
      description: 'wETH from Juice',
      to: juiceVaultAddr, // should be juiceAccountAddr but use juiceVaultAddr now
      meta: {
        highlights: ['Juice'],
      },
    },
    {
      name: 'Deposit',
      description: 'wETH to ezETH Spot Long vault on Juice',
      to: juiceVaultAddr, // should be juiceAccountAddr but use juiceVaultAddr now
      meta: {
        highlights: ['Juice'],
      },
    },
  ],
  gasSaved: 32,
  setActions: () => {
    return [
      {
        href: 'https://app.juice.finance/vaults/0x741011f52B7499ca951f8b8Ee547DD3Cdd813Fda',
        text: 'Review Assets (Juice)',
      },
    ]
  },
}

export default [juice]
