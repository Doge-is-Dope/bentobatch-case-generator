import type { Abi } from 'abitype'
import {
  Context,
  BatchCase,
  InputType,
  TagTitle,
  WalletType,
} from '@/models/cases/v3/types'
import { balance, decimalValidator, max } from '@/models/cases/v3/utils'
import { parseUnits } from 'viem'

import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'
import {
  getWEETHPreviewTxs,
  getWEETHTxs,
  approveAndDepositWEETHToEtherFiVaultPreviewTx,
  approveAndDepositWEETHToEtherFiVaultTx,
  estimateWEETHAmount,
} from '../prebuilt-tx/etherfi'

const tags = [
  { title: TagTitle.Benefits },
  { title: TagTitle.Defi },
  { title: TagTitle.Restaking },
]

const etherFiLiquid: BatchCase = {
  id: 'ether_fi_liquid',
  name: 'Earn auto-compounded yields plus Etherfi loyalty points and EigenLayer points with ETH',
  description: 'One Click to stake ETH and do liquid yield on Etherfi.',
  details: BATCH_DETAILS,
  website: {
    title: 'Ether.fi Liquid Vault',
    url: 'https://app.ether.fi/liquid/eth',
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
      description: 'Amount to stake',
      validate: decimalValidator(18, BigInt(0)),
      actionContent: balance,
      actionButtons: [max],
    },
  ],
  render: async (context: Context) => {
    const inputs = context.inputs as string[]
    const inputAmount = parseUnits(inputs[0], 18)

    let txs = await getWEETHTxs({ chain: context.chain, inputAmount })
    const weETHAmount = await estimateWEETHAmount({
      chain: context.chain,
      inputAmount,
    })

    txs = txs.concat(
      approveAndDepositWEETHToEtherFiVaultTx({
        inputAmount: weETHAmount,
        receiver: context.account.address,
      })
    )
    return txs
  },
  previewTx: getWEETHPreviewTxs().concat(
    approveAndDepositWEETHToEtherFiVaultPreviewTx()
  ),
  setActions: () => {
    return [
      {
        href: 'https://app.ether.fi/liquid/eth',
        text: 'Check Portfolio (Ether.fi)',
      },
    ]
  },
}

export default [etherFiLiquid]
