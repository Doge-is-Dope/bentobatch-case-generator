import PROTOCOLS_CONSTANT from '@/constants/protocols'
import { Protocol } from '@/cases/types'
import { attributesToHTMLStructure, protocolsToHTMLStructure } from '../utils'

export const CASE_PROTOCOLS = [Protocol.EtherFi]
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
  { id: 'txn_count', name: 'TXN count', value: '5' },
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
                value:
                  'Specify the amount of ETH you wish to use for this Batch.',
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
                  'Note: If you are using Blocto wallet App, "send later" function may result in losing your eligibility for Bento Boxes!',
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
                    value: ' Connect Blocto wallet to ',
                  },
                  {
                    tag: 'span',
                    children: [
                      {
                        tag: 'a',
                        value: 'Etherfi Website',
                        props: {
                          href: 'https://app.ether.fi/liquid/eth',
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
    value: 'Extra Benefits',
  },
  {
    tag: 'ul',
    children: [
      {
        tag: 'li',
        value: 'Extra ',
        children: [
          {
            tag: 'span',
            children: [
              {
                tag: 'a',
                value: 'Ether.fi',
                props: {
                  href: 'http://Ether.fi',
                  target: '_blank',
                  rel: 'noopener noreferrer nofollow',
                },
              },
            ],
          },
          { tag: '', value: ' Loyalty Points for first deposit.' },
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
      ...attributesToHTMLStructure(ATTRIBUTES, ['txn_count']),
      {
        tag: 'li',
        value:
          'Security in Batch: Exact approval amount for all token transfer',
      },
    ],
  },
]

export default BATCH_DETAILS
