import PROTOCOLS_CONSTANT from '@/constants/protocols'
import { Protocol } from '@/cases/types'
import { attributesToHTMLStructure, protocolsToHTMLStructure } from '../utils'

export const CASE_PROTOCOLS = [Protocol.Renzo, Protocol.Zircuit]
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
  { id: 'txn_count', name: 'TXN count', value: '3' },
  { id: 'gas_saved', name: 'Gas saved', value: '~18%' },
]

const BATCH_DETAILS = [
  {
    tag: 'h3',
    value: 'How to use?',
  },
  {
    tag: 'ul',
    value: '',
    children: [
      {
        tag: 'li',
        value: '',
        children: [
          {
            tag: 'strong',
            value: 'Step1: Connect Wallet',
          },
          {
            tag: 'ul',
            value: '',
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
        value: '',
        children: [
          {
            tag: 'strong',
            value: 'Step2: Deposit Funds',
          },
          {
            tag: 'ul',
            value: '',
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
        value: '',
        children: [
          {
            tag: 'strong',
            value: 'Step3: Enter Amount',
          },
          {
            tag: 'ul',
            value: '',
            children: [
              {
                tag: 'li',
                value:
                  'Specify the amount of ETH you wish to use for this Batch.',
              },
            ],
          },
        ],
      },
      {
        tag: 'li',
        value: '',
        children: [
          {
            tag: 'strong',
            value: 'Step4: Confirm Your Batch!',
          },
          {
            tag: 'ul',
            value: '',
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
        value: '',
        children: [
          {
            tag: 'strong',
            value: 'Step5: Get Extra 15% Zircuit Points',
          },
          {
            tag: 'ul',
            value: '',
            children: [
              {
                tag: 'li',
                value: '',
                children: [
                  {
                    tag: '',
                    value:
                      'Connect Blocto wallet to Zircuit through below link: ',
                  },
                  {
                    tag: 'span',
                    value: '',
                    children: [
                      {
                        tag: 'a',
                        value: 'https://stake.zircuit.com/?ref=BENTOZ',
                        props: {
                          href: 'https://stake.zircuit.com/?ref=BENTOZ',
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
                value: '',
                children: [
                  {
                    tag: '',
                    value:
                      "Please use WalletConnect to connect your Blocto Wallet. You'll need the Blocto App to scan and log in. ",
                  },
                  {
                    tag: 'span',
                    value: '',
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
    value: '',
    children: [
      {
        tag: 'li',
        value: 'Extra 15% Zircuit Points',
      },
    ],
  },
  {
    tag: 'h3',
    value: 'Protocols',
  },
  {
    tag: 'ul',
    value: '',
    children: protocolsToHTMLStructure(protocolInfo),
  },
  {
    tag: 'h3',
    value: 'Summary',
  },
  {
    tag: 'ul',
    value: '',
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
    value: '',
    children: [
      {
        tag: 'li',
        value: 'Stake ETH to Renzo',
      },
      {
        tag: 'li',
        value: 'Approve $ezETH',
      },
      {
        tag: 'li',
        value: 'Stake $ezETH to Zircuit',
      },
    ],
  },
]

export default BATCH_DETAILS
