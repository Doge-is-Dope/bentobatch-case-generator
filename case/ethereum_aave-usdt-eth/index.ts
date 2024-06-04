import type { Abi } from 'abitype'
import {
  Context,
  BatchCase,
  InputType,
  Tag,
  Tx,
  ActionsArgs,
  TagTitle,
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
import {
  approveERC20PreviewTx,
  approveERC20Tx,
  allowance,
} from '../prebuilt-tx/ERC20'
import AAVE_POOL_V3 from './abi/AAVE_POOL_V3.json'
import AAVE_WRAPPED_TOKEN_GATEWAY_V3 from './abi/AAVE_WRAPPED_TOKEN_GATEWAY_V3.json'
import DEBT_WETH from './abi/DEBT_WETH.json'
import PRICE_FEED from './abi/PRICE_FEED.json'
import BATCH_DETAILS, { CASE_PROTOCOLS, ATTRIBUTES } from './usdt.eth.details'

const usdtAddr = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const aavePoolV3Addr = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'
const aaveWrappedTokenGatewayV3Addr =
  '0x893411580e590D62dDBca8a703d61Cc4A8c7b2b9'
const debtWethAddr = '0xeA51d7853EEFb32b6ee06b1C12E6dcCA88Be0fFE'

const usdtEthCase: BatchCase = {
  id: 'aave_usdt_eth',
  name: 'Deposit USDT to borrow ETH on AAVE',
  description:
    'One click to deposit USDT and borrow 70% equivalent value in ETH.',
  details: BATCH_DETAILS,
  website: {
    title: 'AAVE',
    url: 'https://aave.com/',
  },
  tags: [TagTitle.Defi, TagTitle.Lending].map(
    (name) => ({ title: name }) as Tag
  ),
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
      name: 'USDT Amount',
      inputType: InputType.ERC20Amount,
      description: 'Supply to AAVE as collateral',
      validate: decimalValidator(6, BigInt(0)),
      options: {
        token: usdtAddr,
      },
      actionContent: balance,
      actionButtons: [max],
    },
    {
      name: 'Borrow Percentage',
      inputType: InputType.Text,
      description:
        'Percentage of the supplied USDT to be borrowed as ETH (Max: 70%)',
      validate: decimalValidator(0, BigInt(0), BigInt(70)),
    },
  ],
  previewTx: [
    approveERC20PreviewTx({
      tokenAddress: usdtAddr,
      tokenSymbol: 'USDT',
      spenderName: 'AAVE',
    }),
    {
      name: 'Supply',
      description: `USDT to AAVE as collateral`,
      to: aavePoolV3Addr,
      meta: {
        highlights: ['AAVE'],
      },
    },
    {
      name: 'Disable',
      description: `AAVE E-Mode if it is enabled`,
      to: aavePoolV3Addr,
      meta: {
        highlights: ['AAVE'],
      },
    },
    {
      name: 'Delegate',
      description: `borrowing power on the debt WETH if needed`,
      to: debtWethAddr,
      meta: {
        highlights: ['AAVE'],
      },
    },
    {
      name: 'Borrow',
      description: `ETH from AAVE`,
      to: aaveWrappedTokenGatewayV3Addr,
      meta: {
        highlights: ['AAVE'],
      },
    },
  ],
  setActions: (_: ActionsArgs) => {
    return [
      {
        href: 'https://app.aave.com/',
        text: 'Manage Position (AAVE)',
      },
    ]
  },
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

    const aavePoolV3 = getContract({
      address: aavePoolV3Addr,
      abi: AAVE_POOL_V3,
      client: client,
    })

    const aaveWrappedTokenGatewayV3 = getContract({
      address: aaveWrappedTokenGatewayV3Addr,
      abi: AAVE_WRAPPED_TOKEN_GATEWAY_V3,
      client: client,
    })

    const debtWeth = getContract({
      address: debtWethAddr,
      abi: DEBT_WETH,
      client: client,
    })

    const usdtAllowance = await allowance({
      chain: context.chain,
      userAddress: context.account.address || '0x',
      tokenAddress: usdtAddr,
      spenderAddress: aavePoolV3Addr,
    })

    const usdtAmount = parseUnits(inputs[0], 6)

    if (usdtAmount > usdtAllowance) {
      txs.push(
        approveERC20Tx({
          tokenAddress: usdtAddr,
          tokenSymbol: 'USDT',
          tokenDecimals: 6,
          spenderAddress: aavePoolV3Addr,
          spenderName: 'AAVE',
          amount: usdtAmount,
        })
      )
    }

    txs.push({
      name: `Supply`,
      description: `${inputs[0]} USDT to AAVE as collateral`,
      to: aavePoolV3.address,
      value: 0n,
      data: encodeFunctionData({
        abi: aavePoolV3.abi,
        functionName: 'supply',
        args: [
          usdtAddr, // asset
          usdtAmount, // amount
          context.account.address, // onBehalfOf
          0, // referralCode, is currently inactive
        ],
      }),
      abi: aavePoolV3.abi as Abi,
      meta: {
        highlights: ['AAVE'],
      },
    })

    const isInEMode =
      (await aavePoolV3.read.getUserEMode([context.account.address])) == 1n

    if (isInEMode) {
      txs.push({
        name: `Disable`,
        description: `AAVE E-Mode`,
        to: aavePoolV3.address,
        value: 0n,
        data: encodeFunctionData({
          abi: aavePoolV3.abi,
          functionName: 'setUserEMode',
          args: [
            0, // categoryId
          ],
        }),
        abi: aavePoolV3.abi as Abi,
        meta: {
          highlights: ['AAVE'],
        },
      })
    }

    const usdtPriceFeedAddr = '0xC26D4a1c46d884cfF6dE9800B6aE7A8Cf48B4Ff8'
    const ethPriceFeedAddr = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'

    const usdtPriceFeed = getContract({
      address: usdtPriceFeedAddr,
      abi: PRICE_FEED,
      client: client,
    })

    const ethPriceFeed = getContract({
      address: ethPriceFeedAddr,
      abi: PRICE_FEED,
      client: client,
    })

    const usdtPrice = (await usdtPriceFeed.read.latestAnswer()) as bigint
    const collateralValue = (usdtPrice * parseUnits(inputs[0], 6)) / 1000000n
    const ethPrice = (await ethPriceFeed.read.latestAnswer()) as bigint
    const percentage = Number(inputs[1]) / 100
    const borrowAmount =
      (Number(collateralValue) * percentage) / Number(ethPrice)
    const ethAmount = parseUnits(borrowAmount.toString(), 18)

    const borrowAllowance = (await debtWeth.read.borrowAllowance([
      context.account.address,
      aaveWrappedTokenGatewayV3Addr,
    ])) as bigint

    if (ethAmount > borrowAllowance) {
      txs.push({
        name: `Delegate`,
        description: `borrowing power on the debt WETH`,
        to: debtWeth.address,
        value: 0n,
        data: encodeFunctionData({
          abi: debtWeth.abi,
          functionName: 'approveDelegation',
          args: [
            aaveWrappedTokenGatewayV3Addr, // delegatee
            ethAmount, // amount
          ],
        }),
        abi: debtWeth.abi as Abi,
      })
    }

    txs.push({
      name: `Borrow`,
      description: `${formatUnits(ethAmount, 18)} ETH from AAVE`,
      to: aaveWrappedTokenGatewayV3.address,
      value: 0n,
      data: encodeFunctionData({
        abi: aaveWrappedTokenGatewayV3.abi,
        functionName: 'borrowETH',
        args: [
          aavePoolV3Addr, // delegatee
          ethAmount, // amount
          2, // interestRateMode
          0, // referralCode, is currently inactive
        ],
      }),
      abi: aaveWrappedTokenGatewayV3.abi as Abi,
      meta: {
        highlights: ['AAVE'],
      },
    })

    return txs
  },
}

export default usdtEthCase
