import {
  Context,
  BatchCase,
  InputType,
  Tx,
  TagTitle,
  WalletType,
} from '@/models/cases/v3/types'
import { balance, decimalValidator, max } from '@/models/cases/v3/utils'
import { parseUnits, Chain, parseEther } from 'viem'

import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from './index.details'
import {
  estimateWSTETHAmount,
  stakeToLidoPreviewTx,
  stakeToLidoTx,
  wrapSTETHToWSTETHPreviewTx,
  wrapSTETHToWSTETHTx,
  apporveSTETHToWSTETHPreviewTx,
  checkOrApporveSTETHToWSTETHTx,
} from '../prebuilt-tx/lido'
import {
  supplyWSTETHTx,
  supplyWSTETHPreviewTx,
  enableEModeTx,
  enableEModePreviewTx,
  delegateTx,
  delegatePreviewTx,
  borrowETHPreviewTx,
  borrowETHTx,
  apporveWSTETHToAAVEPreviewTx,
  checkOrApporveWSTETHToAAVETx,
  checkEmode,
} from '../prebuilt-tx/aave'

const BorrowRatioN = 0.9

const tags = [{ title: TagTitle.Defi }, { title: TagTitle.Restaking }]

const stakeWrapSupply: (params: {
  chain: Chain
  userAddress: `0x${string}` | undefined
  inputAmount: bigint
}) => Promise<Tx[]> = async (params) => {
  const { chain, userAddress, inputAmount } = params

  const txs: Tx[] = []
  // stake
  txs.push(stakeToLidoTx({ inputAmount }))
  // wrap stETH to wstETH
  txs.push(wrapSTETHToWSTETHTx({ chain, inputAmount: inputAmount - BigInt(1) }))

  // estimate wstETH
  const wstETHAmount = await estimateWSTETHAmount({
    chain: chain,
    inputAmount,
  })
  // supply wstETH
  txs.push(
    supplyWSTETHTx({
      inputAmount: wstETHAmount, //BigInt(Math.floor(Number(wstETHAmount) * 0.8)),
      onBehalfOf: userAddress,
    })
  )

  return txs
}

const borrowStakeWrapSupply: (params: {
  chain: Chain
  userAddress: `0x${string}` | undefined
  borrowAmount: bigint
}) => Promise<Tx[]> = async (params) => {
  const { chain, userAddress, borrowAmount } = params

  let txs: Tx[] = []
  // borrow ETH
  txs.push(borrowETHTx({ inputAmount: borrowAmount }))

  txs = txs.concat(
    await stakeWrapSupply({ chain, userAddress, inputAmount: borrowAmount })
  )

  return txs
}

// a(1-r^n)/(1-r) >= b, know a, r, b, find mininum n
function calculateMinimumN(
  a: number,
  r: number,
  b: number
): { minN: number; minNResult: number } {
  if (r <= 0 || r >= 1) {
    throw new Error('r must be between 0 and 1 (0 < r < 1)')
  }

  const numerator = Math.log((a - b * (1 - r)) / a)
  const denominator = Math.log(r)

  if (denominator === 0) {
    throw new Error('Logarithm of r resulted in 0, invalid input.')
  }

  // Since n must be an integer, take the ceiling to find the minimum integer value
  const n = Math.ceil(numerator / denominator)

  // Calculate the final result for the minimum n
  const minNResult = (a * (1 - Math.pow(r, n))) / (1 - r)

  return { minN: n, minNResult }
}

// decimalValidator not fit for this case
export const multiplierValidator =
  (min?: number, max?: number) => (value: string) => {
    const regex = /^-?\d+(\.\d+)?$/
    if (!regex.test(value)) {
      throw new Error('Invalid number')
    }
    let num = parseFloat(value)
    if (min !== undefined && num < min) {
      throw new Error(`Number must be greater than or equal to ${min}`)
    }
    if (max !== undefined && num > max) {
      throw new Error(`Number must be less than  or equal to ${max}`)
    }
  }

const lidoMultiplier: BatchCase = {
  id: 'lido_multiplier',
  name: 'Multiply your Lido staking by AAVE lending',
  description:
    'One Click to repeatedly stake ETH on Lido through lending and borrowing on AAVE',
  details: BATCH_DETAILS,
  website: {
    title: 'Lido',
    url: 'https://stake.lido.fi/',
  },
  tags,
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  protocols: CASE_PROTOCOLS,
  // @todo: wait until the image of the protocols are ready
  // attributes: ATTRIBUTES,
  networkId: 1,
  atomic: true,
  renderExpiry: 30,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'ETH Amount',
      inputType: InputType.NativeAmount,
      description: 'Amount to supply',
      validate: decimalValidator(18, BigInt(0)),
      actionContent: balance,
      actionButtons: [max],
    },
    {
      name: 'Risk Multiplier',
      inputType: InputType.Text,
      description:
        'Risk Multiplier you want to take. Ex: Multiplier is 5 and supply 1 ETH, means borrow 4 ETH and wrap all to wstETH and suuply all wstETH to AAVE (Min: 1.0, Max: 5.0)',
      validate: multiplierValidator(1, 5),
    },
  ],
  render: async (context: Context) => {
    const inputs = context.inputs as string[]
    const inputAmount = parseUnits(inputs[0], 18)
    const inputEther = Number(inputs[0])
    const riskMultiplier = Number(inputs[1])

    // minN
    const { minN, minNResult } = calculateMinimumN(
      inputEther,
      BorrowRatioN,
      inputEther * riskMultiplier
    )

    // estimate wstETH
    const targetEther = inputEther * riskMultiplier
    const targetAmount = parseUnits(targetEther.toString(), 18)

    let txs = []
    // enable E-Mode
    const isInEMode = await checkEmode({
      chain: context.chain,
      userAddress: context.account.address,
    })
    if (!isInEMode) {
      txs.push(enableEModeTx())
    }
    // delegateTx
    txs.push(delegateTx({ inputAmount: targetAmount }))
    // approve stETH to wstETH
    const approveWSTETHTx = await checkOrApporveSTETHToWSTETHTx({
      chain: context.chain,
      userAddress: context.account.address,
      inputAmount: targetAmount,
    })
    if (approveWSTETHTx != null) {
      txs.push(approveWSTETHTx)
    }
    // approve wstETH to AAVE
    const approveAAVETx = await checkOrApporveWSTETHToAAVETx({
      chain: context.chain,
      userAddress: context.account.address,
      inputAmount: targetAmount,
    })
    if (approveAAVETx != null) {
      txs.push(approveAAVETx)
    }
    // first supply
    txs = txs.concat(
      await stakeWrapSupply({
        chain: context.chain,
        inputAmount,
        userAddress: context.account.address,
      })
    )

    let totalSupplyAmount = inputAmount
    let nextBorrowAmount = inputAmount

    // run n-1 times
    for (let i = 1; i < minN; i++) {
      nextBorrowAmount = (nextBorrowAmount * BigInt(9)) / BigInt(10)
      // other method get redundant borrow, but this way more accuracy
      nextBorrowAmount =
        i == minN - 1 ? targetAmount - totalSupplyAmount : nextBorrowAmount
      txs = txs.concat(
        await borrowStakeWrapSupply({
          chain: context.chain,
          borrowAmount: nextBorrowAmount,
          userAddress: context.account.address,
        })
      )
      totalSupplyAmount += nextBorrowAmount
    }

    return txs
  },
  previewTx: [
    enableEModePreviewTx(),
    delegatePreviewTx(),
    apporveSTETHToWSTETHPreviewTx(),
    apporveWSTETHToAAVEPreviewTx(),
    stakeToLidoPreviewTx(),
    wrapSTETHToWSTETHPreviewTx(),
    supplyWSTETHPreviewTx(),
    borrowETHPreviewTx(),
  ],
  setActions: () => {
    return [
      {
        href: 'https://stake.lido.fi/',
        text: 'Check Portfolio (Lido)',
      },
      {
        href: 'https://app.aave.com/',
        text: 'Check Portfolio (AAVE)',
      },
    ]
  },
}

export default [lidoMultiplier]
