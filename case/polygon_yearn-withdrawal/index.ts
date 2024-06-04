import type { Abi, Address } from 'abitype'
import {
  Context,
  BatchCase,
  Input,
  InputType,
  PreviewTx,
  Tag,
  TagTitle,
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
import yvDAI from './abi/yvDAI-A.json'
import yvUSDC from './abi/yvUSDC-A.json'
import yvUSDT from './abi/yvUSDT-A.json'
import yvWETH from './abi/yvWETH-A.json'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'

const configs = [
  {
    addr: '0x90b2f54C6aDDAD41b8f6c4fCCd555197BC0F773B',
    fromSymbol: 'yvDAI-A',
    toSymbol: 'DAI',
    decimals: 18,
    abi: yvDAI,
  },
  {
    addr: '0xA013Fbd4b711f9ded6fB09C1c0d358E2FbC2EAA0',
    fromSymbol: 'yvUSDC-A',
    toSymbol: 'USDC.e',
    decimals: 6,
    abi: yvUSDC,
  },
  {
    addr: '0xBb287E6017d3DEb0e2E65061e8684eab21060123',
    fromSymbol: 'yvUSDT-A',
    toSymbol: 'USDT',
    decimals: 6,
    abi: yvUSDT,
  },
  {
    addr: '0x305F25377d0a39091e99B975558b1bdfC3975654',
    fromSymbol: 'yvWETH-A',
    toSymbol: 'WETH',
    decimals: 18,
    abi: yvWETH,
  },
]

const yearnWithdrawal: BatchCase = {
  id: 'yearn_withdrawal',
  name: 'Reverse Batch - Withdraw Yearn Fund',
  description: 'One click to withdraw fund from Yearn V3 vault',
  details: BATCH_DETAILS,
  website: {
    title: 'Yearn',
    url: 'https://yearn.fi/v3',
  },
  tags: [TagTitle.Defi, TagTitle.Yield].map((name) => ({ title: name }) as Tag),
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  networkId: 137,
  atomic: true,
  renderExpiry: undefined,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: configs.map(
    (config) =>
      ({
        name: `${config.fromSymbol} Amount (optional)`,
        inputType: InputType.ERC20Amount,
        description: 'Amount to withdraw',
        validate: decimalValidator(config.decimals, BigInt(0)),
        options: {
          token: config.addr,
        },
        actionContent: balance,
        actionButtons: [max],
        isOptional: true,
      }) as Input
  ),
  previewTx: configs.map(
    (config) =>
      ({
        name: 'Withdraw',
        description: `${config.fromSymbol} to ${config.toSymbol} from Yearn`,
        to: config.addr,
        meta: {
          highlights: ['Yearn'],
        },
      }) as PreviewTx
  ),
  render: async (context: Context) => {
    const txs: Tx[] = []

    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    })

    for (let i = 0; i < configs.length; i++) {
      const input = context.inputs[i]
      if (!input) continue

      const config = configs[i]
      const contract = getContract({
        address: config.addr as Address,
        abi: config.abi,
        client: client,
      })

      const fromAmount = parseUnits(input, config.decimals)
      if (fromAmount == 0n) continue
      const pricePerShare = (await contract.read.pricePerShare()) as bigint
      const toAmount =
        (pricePerShare * parseUnits(input, config.decimals)) /
        BigInt(10 ** config.decimals)

      txs.push({
        name: 'Withdraw',
        description: `${input} ${config.fromSymbol} to ${formatUnits(toAmount, config.decimals)} ${config.toSymbol} from Yearn`,
        to: contract.address,
        value: 0n,
        data: encodeFunctionData({
          abi: contract.abi,
          functionName: 'redeem',
          args: [
            fromAmount, // shares
            context.account.address, // receiver
            context.account.address, // owner
            1, // max_loss
          ],
        }),
        abi: contract.abi as Abi,
        meta: {
          highlights: ['Yearn'],
        },
      })
    }

    if (txs.length == 0) throw Error('Please enter at least one field')

    return txs
  },
}

export default [yearnWithdrawal]
