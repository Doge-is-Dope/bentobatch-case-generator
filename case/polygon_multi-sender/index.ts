import type { Abi } from 'abitype'
import {
  Context,
  BatchCase,
  InputType,
  Tag,
  TagTitle,
  Tx,
  WalletType,
} from '@/models/cases/v3/types'
import { balance, decimalValidator, max } from '@/models/cases/v3/utils'
import {
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  isAddress,
  parseUnits,
} from 'viem'
import { balanceOf } from '../prebuilt-tx/ERC20'
import { AddressNotFoundError } from '../error'
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'

const tokenConfig = {
  addr: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}`,
  symbol: 'USDT',
  decimals: 6,
}

const multiSender: BatchCase = {
  id: 'multi_sender',
  name: 'Multi-Send of USDT on Polygon',
  description: 'One-Click to send USDT to multiple addresses.',
  details: BATCH_DETAILS,
  website: {
    title: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  tags: [TagTitle.Asset].map((name) => ({ title: name }) as Tag),
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  networkId: 137,
  atomic: true,
  renderExpiry: undefined,
  inputs: [
    {
      name: `${tokenConfig.symbol} Amount`,
      inputType: InputType.ERC20Amount,
      description: 'Amount to be sent to each recipient',
      validate: decimalValidator(6, BigInt(0)),
      options: {
        token: tokenConfig.addr,
      },
      actionContent: balance,
      actionButtons: [max],
    },
    {
      name: 'Recipients',
      inputType: InputType.Text,
      description:
        'List of addresses with a maximum limit of 30, separated by comma',
    },
  ],
  previewTx: [
    {
      name: 'Transfer',
      description: 'USDT to recipient',
      to: tokenConfig.addr,
    },
    {
      name: 'Transfer',
      description: 'USDT to recipient',
      to: tokenConfig.addr,
    },
    {
      name: 'Transfer',
      description: 'USDT to recipient',
      to: tokenConfig.addr,
    },
  ],
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  render: async (context: Context) => {
    const txs: Tx[] = []

    const userAddress = context.account.address
    if (!userAddress) throw new AddressNotFoundError()

    const inputs = context.inputs as string[]
    const amount = parseUnits(inputs[0], tokenConfig.decimals)
    const addresses = inputs[1]
      .split(',')
      .filter((address) => address)
      .map((address) => {
        const trimmedAddress = address.trim()
        if (!isAddress(trimmedAddress)) {
          throw Error('Recipients contain invalid address(es)')
        }
        return trimmedAddress
      })

    if (addresses.length > 30) {
      throw Error('The recipients exceeds the limit of 30')
    }

    const totalAmount = amount * BigInt(addresses.length)
    const userBalance = await balanceOf({
      chain: context.chain,
      userAddress: userAddress,
      tokenAddress: tokenConfig.addr,
    })
    if (totalAmount > userBalance) {
      throw Error(
        `Insufficient balance: need ${formatUnits(totalAmount, tokenConfig.decimals)} ${tokenConfig.symbol} in total`
      )
    }

    addresses.forEach((address) => {
      txs.push({
        name: 'Transfer',
        description: `${inputs[0]} ${tokenConfig.symbol} to ${address}`,
        to: tokenConfig.addr,
        value: 0n,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [
            address, // recipient
            amount, // amount
          ],
        }),
        abi: erc20Abi as Abi,
      })
    })

    return txs
  },
}

export default [multiSender]
