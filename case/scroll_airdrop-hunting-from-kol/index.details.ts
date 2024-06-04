import PROTOCOLS_CONSTANT from '@/constants/protocols'
import { Protocol } from '@/cases/types'
import { attributesToHTMLStructure, protocolsToHTMLStructure } from '../utils'

export const CASE_PROTOCOLS = [
  Protocol.Penpad,
  Protocol.SyncSwap,
  Protocol.KyberNetwork,
  Protocol.SpaceFI,
]
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
  { id: 'txn_count', name: 'TXN count', value: '6' },
  { id: 'gas_saved', name: 'Gas saved', value: '~18%' },
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
                  'Ensure you have ETH in your Blocto Wallet. Your wallet address can be found in the top right corner.',
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
                value: 'Specify the amount of ETH to swap',
                children: [
                  {
                    tag: 'ul',
                    children: [
                      {
                        tag: 'li',
                        value:
                          'Batch transactions can assist you in swapping ETH to USDC and back on various protocols seamlessly.',
                      },
                    ],
                  },
                ],
              },
              {
                tag: 'li',
                value: 'Specify the amount of ETH to stake on Penpad',
              },
              {
                tag: 'li',
                value:
                  'Note: Avoid using max ETH to swap, as it may leave insufficient ETH for staking on Penpad!',
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
            value: 'Step5: Get Extra 10% Penpad Points!',
          },
          {
            tag: 'ul',
            children: [
              {
                tag: 'li',
                children: [
                  {
                    tag: '',
                    value:
                      'Connect Blocto wallet to Penpad through below link: ',
                  },
                  {
                    tag: 'span',
                    children: [
                      {
                        tag: 'a',
                        value: 'https://penpad.io/ref/VVOUGC?launch',
                        props: {
                          href: 'https://penpad.io/ref/VVOUGC?launch',
                          target: '_blank',
                          rel: 'noopener noreferrer nofollow',
                        },
                      },
                    ],
                  },
                  {
                    tag: '',
                    value: '.',
                  },
                ],
              },
              {
                tag: 'li',
                children: [
                  {
                    tag: '',
                    value:
                      "Please use WalletConnect to connect your Blocto Wallet. You'll need the Blocto App to scan and log in. ",
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
            ],
          },
        ],
      },
    ],
  },
  {
    tag: 'h3',
    value: 'Extra Benefits',
  },
  {
    tag: 'ul',
    children: [
      {
        tag: 'li',
        value: 'Extra 10% Penpad Points',
      },
      {
        tag: 'li',
        value: 'Random $BLT airdrop reward. $100 $BLT maximum per user.',
      },
    ],
  },
  {
    tag: 'span',
    children: [
      { tag: '', value: 'The basic prize pool is $2000 equivalent $BLT' },
      { tag: 'br' },
      {
        tag: '',
        value:
          'More than 1,000 participating users, with a prize pool of $4,000 equivalent $BLT',
      },
      { tag: 'br' },
      {
        tag: '',
        value:
          'More than 2,000 participating users, with a prize pool of $7,000 equivalent $BLT',
      },
      { tag: 'br' },
      {
        tag: '',
        value:
          'More than 3,000 participating users, with a prize pool of $10,000 equivalent $BLT',
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
        value: 'Swap ETH to USDC on SyncSwap',
      },
      {
        tag: 'li',
        value: 'Approve USDC on KyperNetwork',
      },
      {
        tag: 'li',
        value: 'Swap 50% USDC to ETH on KyperNetwork',
      },
      {
        tag: 'li',
        value: 'Approve USDC on Spacefi',
      },
      {
        tag: 'li',
        value: 'Swap 50% USDC to ETH on Spacefi',
      },
      {
        tag: 'li',
        value: 'Stake ETH on Penpad',
      },
    ],
  },
]

export default BATCH_DETAILS
