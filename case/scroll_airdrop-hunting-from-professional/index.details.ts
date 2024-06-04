import PROTOCOLS_CONSTANT from '@/constants/protocols'
import { Protocol } from '@/cases/types'
import { attributesToHTMLStructure, protocolsToHTMLStructure } from '../utils'

export const CASE_PROTOCOLS = [Protocol.Ambient, Protocol.CogFinance]
const protocolInfo = CASE_PROTOCOLS?.map(
  (protocol) => PROTOCOLS_CONSTANT[protocol]
)

export const ATTRIBUTES = [
  // @todo: wait until the image of the protocols are ready
  // {
  //   id: 'protocols',
  //   name: 'Protocols',
  //   items: protocolInfo,
  // },
  { id: 'txn_count', name: 'TXN count', value: '23' },
  { id: 'gas_saved', name: 'Gas saved', value: '~22%' },
]

const BATCH_DETAILS = [
  {
    tag: 'h3',
    value: 'How to use?',
  },
  {
    tag: 'ul',
    children: [
      {
        tag: 'li',
        children: [
          {
            tag: 'strong',
            value: 'Step1: Connect Wallet',
          },
          {
            tag: 'ul',
            children: [
              {
                tag: 'li',
                value: `Connect your Blocto wallet or register a new one directly through the "connect wallet"!`,
              },
            ],
          },
        ],
      },
      {
        tag: 'li',
        children: [
          {
            tag: 'strong',
            value: 'Step2: Deposit Funds',
          },
          {
            tag: 'ul',
            children: [
              {
                tag: 'li',
                value:
                  'Ensure you have USDC and ETH in your Blocto Wallet. Your wallet address can be found in the top right corner.',
              },
              {
                tag: 'li',
                value:
                  'Note: There may be an extra gas fee required for activating the smart wallet for the first time on every chain.',
              },
            ],
          },
        ],
      },
      {
        tag: 'li',
        children: [
          {
            tag: 'strong',
            value: 'Step3: Enter Amount',
          },
          {
            tag: 'ul',
            children: [
              {
                tag: 'li',
                value:
                  'Specify the amount of USDC you wish to use for this Batch.',
              },
              {
                tag: 'li',
                value: 'Note: Slippage is by default.',
              },
            ],
          },
        ],
      },
      {
        tag: 'li',
        children: [
          {
            tag: 'strong',
            value: 'Step4: Confirm Your Batch!',
          },
          {
            tag: 'ul',
            children: [
              {
                tag: 'li',
                value:
                  'Note: If you are using Blocto wallet App, "Send Later" function may result in losing your eligibility for Bento Boxes!',
              },
            ],
          },
        ],
      },
      {
        tag: 'li',
        children: [
          {
            tag: 'strong',
            value: 'Check your assets',
          },
          {
            tag: 'ul',
            children: [
              {
                tag: 'li',
                children: [
                  {
                    tag: '',
                    value: 'You can check your asset on Blocto Wallet App. ',
                  },
                  {
                    tag: 'span',
                    children: [
                      {
                        tag: 'a',
                        value: 'Download Blocto App',
                        props: {
                          href: 'https://blocto.io/download',
                          target: '_blank',
                          rel: 'noopener noreferrer nofollow',
                        },
                      },
                    ],
                  },
                ],
              },
              {
                tag: 'li',
                children: [
                  {
                    tag: '',
                    value: 'You can also check your asset through ',
                  },
                  {
                    tag: 'span',
                    children: [
                      {
                        tag: 'a',
                        value: 'Debank',
                        props: {
                          href: 'https://debank.com/',
                          target: '_blank',
                          rel: 'noopener noreferrer nofollow',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    tag: 'h3',
    value: 'Protocols',
  },
  {
    tag: 'ul',
    children: protocolsToHTMLStructure(protocolInfo),
  },
  {
    tag: 'h3',
    value: 'Summary',
  },
  {
    tag: 'ul',
    children: [
      ...attributesToHTMLStructure(ATTRIBUTES, ['txn_count', 'gas_saved']),
      {
        tag: 'li',
        value:
          'Security in Batch: Exact approval amount for all token transfer',
      },
    ],
  },
  {
    tag: 'h3',
    value: 'Batch Details',
  },
  {
    tag: 'ul',
    children: [
      {
        tag: 'li',
        value: 'Approve USDC to Ambient Swap',
      },
      {
        tag: 'li',
        value: 'Swap USDC to ETH',
      },
      {
        tag: 'li',
        value: 'Wrap ETH',
      },
      {
        tag: 'li',
        value: 'Approve WETH to Cog Finance (USDC/WETH)',
      },
      {
        tag: 'li',
        value: 'Add collateral to Cog Finance with WETH',
      },
      {
        tag: 'li',
        value: 'Borrow USDC from Cog Finance',
      },
      {
        tag: 'li',
        value: 'Approve USDC to Cog Finance',
      },
      {
        tag: 'li',
        value: 'Repay USDC to Cog Finance',
      },
      {
        tag: 'li',
        value: 'Remove WETH Collateral from Cog Finance',
      },
      {
        tag: 'li',
        value: 'Approve WETH to Cog Finance (DAI/WETH)',
      },
      {
        tag: 'li',
        value: 'Add collateral to Cog Finance with WETH',
      },
      {
        tag: 'li',
        value: 'Borrow DAI from Cog Finance',
      },
      {
        tag: 'li',
        value: 'Approve DAI to Cog Finance',
      },
      {
        tag: 'li',
        value: 'Repay DAI to Cog Finance',
      },
      {
        tag: 'li',
        value: 'Remove WETH collateral from Cog Finance',
      },
      {
        tag: 'li',
        value: 'Approve WETH to Cog Finance(USDT/WETH)',
      },
      {
        tag: 'li',
        value: 'Add collateral to Cog Finance with WETH',
      },
      {
        tag: 'li',
        value: 'Borrow USDT from Cog Finance',
      },
      {
        tag: 'li',
        value: 'Approve USDT to Cog Finance',
      },
      {
        tag: 'li',
        value: 'Repay USDT to Cog Finance',
      },
      {
        tag: 'li',
        value: 'Remove WETH collateral from Cog Finance',
      },
      {
        tag: 'li',
        value: 'Unwrap ETH',
      },
      {
        tag: 'li',
        value: 'Swap ETH to USDC',
      },
    ],
  },
]

export default BATCH_DETAILS
