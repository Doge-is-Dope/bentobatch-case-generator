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
  parseUnits,
  http,
} from 'viem'
import OETH from './abi/OETH.json'
import Comptroller from './abi/OrbitComptroller.json'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'

// Addresses
const oETHAddr = '0x0872b71EFC37CB8DdE22B2118De3d800427fdba0' // oTOKEN address
const comptrollerProxyAddr = '0x1E18C3cb491D908241D0db14b081B51be7B6e652' // comptroller proxy address

const borrowRate = 65n // borrow rate. 80% is the safe limit. 65% is the recommended.

const tags = [{ title: TagTitle.Defi }, { title: TagTitle.Lending }]

const orbit: BatchCase = {
  id: 'orbit_points',
  name: 'Earn Orbit Points with ETH',
  description:
    'Supply & Borrow ETH on Orbit to earn Blast Points + Blast Gold + $ORBIT',
  details: BATCH_DETAILS,
  website: {
    title: 'Orbit',
    url: 'https://app.orbitlending.io/',
  },
  tags,
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
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
    {
      name: 'Iterations (1 - 5, default: 1)',
      inputType: InputType.Text,
      description: 'Number of iterations to run',
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
    const iterationsCount =
      inputs[1] && parseInt(inputs[1]) > 0 ? parseInt(inputs[1]) : 1
    // Set initial supply & borrow amount
    let supplyAmount = ethInputAmount
    // @ts-ignore-next-line
    let borrowAmount = (supplyAmount * borrowRate) / 100n

    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    })

    const oETH = getContract({
      address: oETHAddr,
      abi: OETH,
      client: client,
    })

    const comptroller = getContract({
      address: comptrollerProxyAddr,
      abi: Comptroller,
      client: client,
    })

    // Check if user has entered the market
    const { result: hasEntered } = await comptroller.simulate.checkMembership([
      context.account.address,
      oETH.address,
    ])

    // Enter market if not entered
    if (!hasEntered) {
      txs.push({
        name: 'Use',
        description: `oETH to enter market`,
        to: comptroller.address,
        // @ts-ignore-next-line
        value: 0n,
        data: encodeFunctionData({
          abi: comptroller.abi,
          functionName: 'enterMarkets',
          args: [[oETH.address]],
        }),
        abi: comptroller.abi as Abi,
      })
    }

    // Generate transactions for each iteration
    for (let index = 0; index < iterationsCount; index++) {
      // Mint oETH
      txs.push({
        name: `Supply`,
        description: `${index === 0 ? 'initial' : 'borrowed'} ${formatEther(supplyAmount)} ETH to mint oETH`,
        to: oETH.address,
        value: supplyAmount,
        data: encodeFunctionData({
          abi: oETH.abi,
          functionName: 'mint',
        }),
        abi: oETH.abi as Abi,
      })

      // Calculate borrow amount
      // @ts-ignore-next-line
      borrowAmount = (supplyAmount * borrowRate) / 100n

      // Borrow ETH
      txs.push({
        name: `Borrow`,
        description: `ETH ${iterationsCount == 1 ? '' : `- #${index + 1}`} by ${borrowRate}% rate`,
        to: oETH.address,
        // @ts-ignore-next-line
        value: 0n,
        data: encodeFunctionData({
          abi: oETH.abi,
          functionName: 'borrow',
          args: [borrowAmount],
        }),
        abi: oETH.abi as Abi,
      })

      // Update supplyAmount for next iteration
      supplyAmount = borrowAmount
    }

    return txs
  },
  previewTx: [
    {
      name: 'Use',
      description: 'oETH to enter market',
      to: comptrollerProxyAddr,
    },
    {
      name: 'Supply',
      description: `ETH to mint oETH`,
      to: oETHAddr,
    },
    {
      name: `Borrow`,
      description: `ETH by ${borrowRate}% rate`,
      to: oETHAddr,
    },
  ],
  setActions: () => {
    return [
      {
        href: 'https://app.orbitlending.io/',
        text: 'Review Assets (Orbit)',
      },
    ]
  },
}

export default [orbit]
