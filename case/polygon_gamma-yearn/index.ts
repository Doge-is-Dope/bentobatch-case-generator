import {
  Context,
  BatchCase,
  TagTitle,
  Tx,
  InputType,
  WalletType,
} from '@/cases/types'
import {
  balance,
  decimalValidator,
  getDecimals,
  max,
} from '@/models/cases/v3/utils'
import { parseUnits } from 'viem'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'
import { polygon } from 'viem/chains'
import * as gamma from '../prebuilt-tx/gamma'
import * as yearn from '../prebuilt-tx/yearn'
import * as oneInch from '../prebuilt-tx/1inch'
import {
  approveERC20TxIfNeeded,
  approveERC20PreviewTx,
} from '../prebuilt-tx/ERC20'
import { AddressNotFoundError } from '../error'

const tags = [
  { title: TagTitle.Defi },
  { title: TagTitle.Lending },
  { title: TagTitle.Liquidity },
]

const oneInchRouterName = '1inch router'
const uniProxyAddr = '0xA42d55074869491D60Ac05490376B74cF19B00e6'
const lpTokenAddr = '0x3Cc20A6795c4b57d9817399F68E83e71C8626580'
const usdceAddr = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
const usdceSymbol = 'USDC.e'
const wethAddr = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'
const wethSymbol = 'WETH'
const gammaVaultName = 'Gamma Vault'
const lpTokenSymbol = 'aUSDC-WETH'
const gammaLPCompounderAddr = '0x54303F18161d9870b0fc66B88B0B129e8e5fF505'
const yearnVaultName = 'Yearn v3'

const gammaYearnCase: BatchCase = {
  id: 'gamma_yearn',
  name: 'Yield Farming on Yearn with Gamma USDC.e/WETH LP',
  description:
    'One Click to provide USDC.e/WETH LP on Gamma and reinvest it on Yearn V3 vaults.',
  details: BATCH_DETAILS,
  website: {
    title: 'Gamma',
    url: 'https://twitter.com/GammaStrategies',
  },
  tags,
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  networkId: polygon.id,
  atomic: true,
  renderExpiry: 15,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'WETH Amount',
      inputType: InputType.ERC20Amount,
      description: 'Amount to invest',
      options: {
        token: wethAddr,
      },
      validate: decimalValidator(18, parseUnits('2', 16)),
      actionButtons: [max],
      actionContent: balance,
    },
  ],
  render: async (context: Context) => {
    let txs: Tx[] = []

    const userAddress = context.account.address
    if (!userAddress) throw new AddressNotFoundError()

    const inputs = context.inputs as string[]

    const wethAmount = parseUnits(inputs[0], 18)

    const wethDecimals = await getDecimals(wethAddr, context.chain)
    const usdceDecimals = await getDecimals(usdceAddr, context.chain)

    const trialUsdceAmount = await gamma.getDepositAmount({
      chain: context.chain,
      uniProxyAddress: uniProxyAddr,
      lpTokenAddress: lpTokenAddr,
      tokenAddress: wethAddr,
      tokenAmount: wethAmount,
    })

    const srcTokenAmount = await oneInch.getSrcTokenAmount({
      chainId: context.chain.id,
      srcTokenAddress: wethAddr,
      dstAmount: trialUsdceAmount,
      dstTokenAddress: usdceAddr,
      buffer: 0.005,
    })

    const wethInvestAmount =
      (wethAmount * wethAmount) / (srcTokenAmount + wethAmount)
    const usdceInvestAmountInWETH = wethAmount - wethInvestAmount

    // swap WETH to USDC.e
    const { tx: swapWETHToUsdce, dstAmount: usdceAmount } =
      await oneInch.swapTx({
        chainId: context.chain.id,
        userAddress: userAddress,
        srcTokenAddress: wethAddr,
        srcTokenSymbol: wethSymbol,
        srcTokenDecimals: wethDecimals,
        srcAmount: usdceInvestAmountInWETH,
        dstTokenAddress: usdceAddr,
        dstTokenSymbol: usdceSymbol,
        dstTokenDecimals: usdceDecimals,
      })

    const usdceAmountNeeded = await gamma.getDepositAmount({
      chain: context.chain,
      uniProxyAddress: uniProxyAddr,
      lpTokenAddress: lpTokenAddr,
      tokenAddress: wethAddr,
      tokenAmount: wethInvestAmount,
    })

    if (usdceAmountNeeded > usdceAmount)
      throw new Error(`${usdceSymbol} is not enough, please try again.`)

    const approveWethTx = await approveERC20TxIfNeeded({
      chain: context.chain,
      userAddress,
      tokenAddress: wethAddr,
      tokenSymbol: wethSymbol,
      tokenDecimals: wethDecimals,
      spenderAddress: swapWETHToUsdce.to,
      spenderName: oneInchRouterName,
      amount: wethAmount,
    })
    if (approveWethTx) {
      txs.push(approveWethTx)
    }
    txs.push(swapWETHToUsdce)

    const vaultAddr = lpTokenAddr

    const approveUsdceTx = await approveERC20TxIfNeeded({
      chain: context.chain,
      userAddress,
      tokenAddress: usdceAddr,
      tokenSymbol: usdceSymbol,
      tokenDecimals: usdceDecimals,
      spenderAddress: vaultAddr,
      spenderName: gammaVaultName,
      amount: usdceAmountNeeded,
    })
    if (approveUsdceTx) {
      txs.push(approveUsdceTx)
    }

    const approveWethGammaTx = await approveERC20TxIfNeeded({
      chain: context.chain,
      userAddress,
      tokenAddress: wethAddr,
      tokenSymbol: wethSymbol,
      tokenDecimals: wethDecimals,
      spenderAddress: vaultAddr,
      spenderName: gammaVaultName,
      amount: wethInvestAmount,
    })
    if (approveWethGammaTx) {
      txs.push(approveWethGammaTx)
    }

    const {
      tx: gammaTx,
      safeShares,
      sharesDecimals,
    } = await gamma.depositTx({
      chain: context.chain,
      uniProxyAddress: uniProxyAddr,
      userAddress: userAddress,
      lpTokenAddress: lpTokenAddr,
      token0Info: {
        symbol: usdceSymbol,
        address: usdceAddr,
        amount: usdceAmountNeeded,
      },
      token1Info: {
        symbol: wethSymbol,
        address: wethAddr,
        amount: wethInvestAmount,
      },
    })

    txs.push(gammaTx)

    // approve Yearn v3 to spend aUSDC-WETH
    const approveGammaLpToken = await approveERC20TxIfNeeded({
      chain: context.chain,
      userAddress,
      tokenAddress: vaultAddr,
      tokenSymbol: lpTokenSymbol,
      tokenDecimals: sharesDecimals,
      spenderAddress: gammaLPCompounderAddr,
      spenderName: yearnVaultName,
      amount: safeShares,
    })
    if (approveGammaLpToken) {
      txs.push(approveGammaLpToken)
    }

    // deposit aUSDC-WETH to Yearn v3
    const yearnTx = await yearn.depositTx({
      chain: context.chain,
      tokenName: lpTokenSymbol,
      vaultAddress: gammaLPCompounderAddr,
      amount: safeShares,
      receiverAddress: userAddress,
    })
    txs.push(yearnTx)
    return txs
  },
  previewTx: [
    approveERC20PreviewTx({
      tokenAddress: wethAddr,
      tokenSymbol: wethSymbol,
      spenderName: oneInchRouterName,
    }),
    oneInch.swapPreviewTx({
      chainId: polygon.id,
      srcTokenSymbol: wethSymbol,
      dstTokenSymbol: usdceSymbol,
    }),
    approveERC20PreviewTx({
      tokenAddress: usdceAddr,
      tokenSymbol: usdceSymbol,
      spenderName: gammaVaultName,
    }),
    approveERC20PreviewTx({
      tokenAddress: wethAddr,
      tokenSymbol: wethSymbol,
      spenderName: gammaVaultName,
    }),
    gamma.depositPreviewTx({
      token0Symbol: usdceSymbol,
      token1Symbol: wethSymbol,
      uniProxyAddress: uniProxyAddr,
    }),
    approveERC20PreviewTx({
      tokenAddress: lpTokenAddr,
      tokenSymbol: lpTokenSymbol,
      spenderName: yearnVaultName,
    }),
    yearn.depositPreviewTx({
      tokenName: lpTokenSymbol,
      vaultAddress: gammaLPCompounderAddr,
    }),
  ],
  setActions: () => {
    return [
      {
        href: `https://yearn.fi/v3/137/0x54303F18161d9870b0fc66B88B0B129e8e5fF505?action=withdraw`,
        text: 'Manage Position (Yearn V3)',
      },
    ]
  },
}

export default [gammaYearnCase]
