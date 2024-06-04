import type { Abi } from 'abitype'
import {
  Context,
  BatchCase,
  InputType,
  Tx,
  TagTitle,
  WalletType,
} from '@/models/cases/v3/types'
import {
  balance,
  decimalValidator,
  getDecimals,
  max,
  pasteMyAddress,
} from '@/models/cases/v3/utils'
import {
  encodeAbiParameters,
  createPublicClient,
  getContract,
  encodeFunctionData,
  parseUnits,
  http,
  formatEther,
  formatUnits,
} from 'viem'
import EETH from './abi/EETH.json'
import EETHLiquidityPool from './abi/EETHLiquidityPool.json'
import Inbox from './abi/Inbox.json'
import L1GatewayRouter from './abi/L1GatewayRouter.json'
import L1ERC20Gateway from './abi/L1ERC20Gateway.json'
import WeETH from './abi/WeETH.json'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'

const tags = [
  { title: TagTitle.Official },
  { title: TagTitle.Benefits },
  { title: TagTitle.Defi },
  { title: TagTitle.Restaking },
  { title: TagTitle.Bridge },
]

const eethLiqPoolAddr = '0x308861A430be4cce5502d0A12724771Fc6DaF216'
const eETHAddr = '0x35fA164735182de50811E8e2E824cFb9B6118ac2'
const weETHAddr = '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee'
const arbGatewayRouter = '0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef'
const gatewayAddr = '0xa3A7B6F88361F48403514059F1F16C8E78d60EeC'
const inboxAddr = '0x5aed5f8a1e3607476f1f81c3d8fe126deb0afe94'

const etherFiArbitrumBridge: BatchCase = {
  id: 'ether_fi_arbitrum_bridge',
  name: '🔥 Earn extra Ether.Fi points and Bridge',
  description:
    'With official collaboration with Ether.fi. We can earn extra Ether.fi Loyalty Points by staking ETH. The Batch also help user to  bridge $weETH to Arbitrum for further usage.',
  details: BATCH_DETAILS,
  website: {
    title: 'Ether.fi',
    url: 'https://ether.fi',
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
  renderExpiry: 15,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'ETH Amount',
      inputType: InputType.NativeAmount,
      description:
        'Amount to stake and bridge (leave ~0.001 ETH for bridging fee)',
      validate: decimalValidator(18, BigInt(0)),
      actionContent: balance,
      actionButtons: [max],
    },
    {
      name: 'Target Address',
      inputType: InputType.Address,
      description:
        'Target address on Arbitrum (make sure your arbitrum address is consistent with "My Address" on Ethereum)',
      actionButtons: [pasteMyAddress],
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
    const inputAmount = parseUnits(inputs[0], 18)

    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    })

    const eethLiqPool = getContract({
      address: eethLiqPoolAddr,
      abi: EETHLiquidityPool,
      client: client,
    })

    txs.push({
      name: 'Stake',
      description: `${formatEther(inputAmount)} ETH to ether.fi`,
      to: eethLiqPoolAddr,
      value: inputAmount,
      data: encodeFunctionData({
        abi: EETHLiquidityPool,
        functionName: 'deposit',
      }),
      abi: EETHLiquidityPool as Abi,
      meta: {
        highlights: ['ether.fi'],
      },
    })
    const { result: weETHAmount } = await eethLiqPool.simulate.deposit([], {
      value: inputAmount,
    })
    const eETHAmount = (await eethLiqPool.read.amountForShare([
      weETHAmount,
    ])) as bigint

    // approve
    const eETH = getContract({
      address: eETHAddr,
      abi: EETH,
      client: client,
    })
    const eETHDecimals = await getDecimals(eETHAddr, context.chain)
    txs.push({
      name: 'Approve',
      description: `${formatUnits(eETHAmount, eETHDecimals)} eETH to ether.fi`,
      to: eETHAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: EETH,
        functionName: 'approve',
        args: [
          weETHAddr, // address
          eETHAmount, // assets
        ],
      }),
      abi: EETH as Abi,
      meta: {
        highlights: ['ether.fi'],
      },
    })

    // wrap
    txs.push({
      name: 'Wrap',
      description: `${formatUnits(eETHAmount, eETHDecimals)} eETH into weETH`,
      to: weETHAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: WeETH,
        functionName: 'wrap',
        args: [
          eETHAmount, // assets
        ],
      }),
      abi: WeETH as Abi,
    })

    const weETHDecimals = await getDecimals(weETHAddr, context.chain)
    txs.push({
      name: 'Approve',
      description: `${formatUnits(weETHAmount, weETHDecimals)} weETH to ether.fi`,
      to: weETHAddr,
      value: 0n,
      data: encodeFunctionData({
        abi: WeETH,
        functionName: 'approve',
        args: [
          gatewayAddr,
          weETHAmount, // assets
        ],
      }),
      abi: WeETH as Abi,
      meta: {
        highlights: ['ether.fi'],
      },
    })

    // bridge
    const arbAddr = inputs[1]
    const gasLimit = 200000n
    const maxFeePerGas = 300000000n

    const gateway = getContract({
      address: gatewayAddr,
      abi: L1ERC20Gateway,
      client: client,
    })
    const outboundCalldata = await gateway.read.getOutboundCalldata([
      weETHAddr, // token
      arbGatewayRouter, // from
      arbAddr, // to
      weETHAmount, // amount
      '0x', // calldata,
    ])

    const inbox = getContract({
      address: inboxAddr,
      abi: Inbox,
      client: client,
    })

    const submissionFee = await inbox.read.calculateRetryableSubmissionFee([
      (outboundCalldata as string).length / 2, // data length
      0, // base fee
    ])

    const maxSubmissionCost = ((submissionFee as bigint) * 12n) / 10n

    const calldata = encodeAbiParameters(
      [
        { name: 'x', type: 'uint256' }, // max submission cost
        { name: 'y', type: 'bytes' }, // data
      ],
      [maxSubmissionCost, '0x']
    )

    const amount = weETHAmount - 1n
    txs.push({
      name: 'Bridge',
      description: `${formatUnits(amount, weETHDecimals)} weETH into Arbitrum One`,
      to: arbGatewayRouter,
      value: gasLimit * maxFeePerGas + maxSubmissionCost,
      data: encodeFunctionData({
        abi: L1GatewayRouter,
        functionName: 'outboundTransfer',
        args: [
          weETHAddr, // token
          arbAddr, // to
          amount, // amount, minus 1 for temp fix
          gasLimit, // max gas
          maxFeePerGas, // gas price bid
          calldata, // _data = ()
        ],
      }),
      abi: L1GatewayRouter as Abi,
      meta: {
        highlights: ['Arbitrum One'],
      },
    })

    return txs
  },
  previewTx: [
    {
      name: 'Stake',
      description: 'ETH to ether.fi',
      to: eethLiqPoolAddr,
      meta: {
        highlights: ['ether.fi'],
      },
    },
    {
      name: 'Approve',
      description: 'eETH to ether.fi',
      to: eETHAddr,
      meta: {
        highlights: ['ether.fi'],
      },
    },
    {
      name: 'Wrap',
      description: 'eETH to weETH',
      to: weETHAddr,
    },
    {
      name: 'Approve',
      description: 'weETH to ether.fi',
      to: weETHAddr,
      meta: {
        highlights: ['ether.fi'],
      },
    },
    {
      name: 'Bridge',
      description: 'weETH to Arbitrum One',
      to: arbGatewayRouter,
      meta: {
        highlights: ['Arbitrum One'],
      },
    },
  ],
  setActions: () => {
    return [
      {
        href: 'https://app.ether.fi/portfolio',
        text: 'Check Portfolio (Etherfi))',
      },
    ]
  },
}

export default [etherFiArbitrumBridge]
