import {
  Context,
  BatchCase,
  Tx,
  InputType,
  TagTitle,
  PreviewTx,
  WalletType,
} from '@/cases/types'
import { balance, decimalValidator, max } from '@/models/cases/v3/utils'
import { parseUnits } from 'viem'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'
import { swapTx } from '@/cases/prebuilt-tx/1inch'
import {
  approveERC20PreviewTx,
  approveERC20Tx,
  allowance,
} from '@/cases/prebuilt-tx/ERC20'
import type { Abi, Address } from 'abitype'
import { getDecimals } from '@/models/cases/v3/utils'

const tags = [{ title: TagTitle.Defi }, { title: TagTitle.Dex }]

// 1inch address
const oneInchAddress = '0x111111125421ca6dc452d289314280a0f8842a65'
// USDT address
const USDTAddr = '0xdac17f958d2ee523a2206206994597c13d831ec7'

async function fetchCMCByMarketCap(): Promise<any> {
  const response = await fetch('/case/api/cmc/top10erc20')
  if (!response.ok) {
    const error = await response.json()
    throw new Error(`${response.status}: ${error.error}`)
  }
  return await response.json()
}
// top1 - top10 preview
const BatchPreview = Array.from({ length: 10 }, (_, index) => index + 1).map(
  (i) =>
    ({
      name: 'Swap',
      description: `USDT to Top${i} token`,
      to: oneInchAddress,
      meta: {
        highlights: [`Top${i}`],
      },
    }) as PreviewTx
)

const etfEthereumTop10: BatchCase = {
  id: 'etf_ethereum_top10',
  name: 'Ethereum10 Crypto ETF',
  description:
    'One click to buy and auto-rebalance the top 10 valuation Ethereum-based crypto tokens.',
  details: BATCH_DETAILS,
  website: {
    title: 'Bento ETH',
    url: 'https://x.com/bentobatch',
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
      name: 'USDT Amount',
      inputType: InputType.ERC20Amount,
      description: 'Swap to top 10 Ethereum using 1inch',
      validate: decimalValidator(6, BigInt(0)),
      options: {
        token: USDTAddr,
      },
      actionContent: balance,
      actionButtons: [max],
    },
  ],
  render: async (context: Context) => {
    // fetch CMC
    const data = await fetchCMCByMarketCap()
    // Calculate the total market cap
    const totalMarketCap = data.reduce(
      (total: number, item: any) => total + item.market_cap,
      0
    )
    // Calculate the percentage for each item
    const top10tokens = data.map((item: any) => ({
      symbol: item.symbol,
      address: item.address,
      percentage: (item.market_cap / totalMarketCap) * 10000,
    }))
    const usdtAmount = parseUnits(context.inputs[0] as string, 6)

    let txs: Tx[] = []

    // check allowance
    const allowanceAmount = await allowance({
      chain: context.chain,
      userAddress: context.account.address as Address,
      tokenAddress: USDTAddr,
      spenderAddress: oneInchAddress,
    })
    // usdt approve
    if (allowanceAmount < usdtAmount) {
      if (allowanceAmount > BigInt(0)) {
        // clear allowance first, detail see  https://etherscan.io/address/0xdac17f958d2ee523a2206206994597c13d831ec7#code
        txs.push(
          approveERC20Tx({
            tokenAddress: USDTAddr,
            tokenSymbol: 'USDT',
            tokenDecimals: 6,
            spenderAddress: oneInchAddress,
            spenderName: '1Inch',
            amount: BigInt(0),
          })
        )
      }
      txs.push(
        approveERC20Tx({
          tokenAddress: USDTAddr,
          tokenSymbol: 'USDT',
          tokenDecimals: 6,
          spenderAddress: oneInchAddress,
          spenderName: '1Inch',
          amount: usdtAmount,
        })
      )
    }

    const decimalAbi: Abi = [
      {
        constant: true,
        inputs: [],
        name: 'decimals',
        outputs: [
          {
            name: '',
            type: 'uint8',
          },
        ],
        payable: false,
        stateMutability: 'pure',
        type: 'function',
      },
    ]

    let sumUsdt = BigInt(0)
    // order will different if using forEach, because of async
    // top10tokens.forEach(async (token) => {
    // it take time but will get order
    for (let token of top10tokens) {
      let decimals = 18
      if (token.symbol !== 'ETH') {
        decimals = await getDecimals(token.address, context.chain)
      }

      const usdtUsage =
        (usdtAmount * BigInt(token.percentage.toFixed(0) - 1)) / BigInt(10000)
      sumUsdt += usdtUsage
      const address =
        token.symbol !== 'ETH'
          ? token.address
          : '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      const { tx } = await swapTx({
        chainId: 1,
        userAddress: context.account.address as Address,
        srcTokenAddress: USDTAddr,
        srcTokenSymbol: 'USDT',
        srcTokenDecimals: 6,
        srcAmount: usdtUsage,
        dstTokenAddress: address,
        dstTokenSymbol: token.symbol,
        dstTokenDecimals: decimals, // enhance: get token decimals from contract
      })

      txs.push(tx)
    }
    return txs
  },
  gasSaved: 18,
  previewTx: [
    approveERC20PreviewTx({
      tokenAddress: USDTAddr,
      tokenSymbol: 'USDT',
      spenderName: '1inch',
    }),
  ].concat(BatchPreview),
  // previewTx: BatchPreview,
  setActions: (args) => {
    return []
  },
}

export default [etfEthereumTop10]
