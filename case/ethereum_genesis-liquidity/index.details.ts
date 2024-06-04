import PROTOCOLS_CONSTANT from '@/constants/protocols'
import { Protocol } from '@/cases/types'
import { attributesToHTMLStructure, protocolsToHTMLStructure } from '../utils'

export const CASE_PROTOCOLS = [Protocol.Lido, Protocol.Genesis]
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
  { id: 'txn_count', name: 'TXN count', value: '7' },
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
              {
                tag: 'li',
                value:
                  'Note: The Batch will automatically calculate the corresponding $genETH and $stETH for you.',
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
                    value: 'Review your assets on ',
                  },
                  {
                    tag: 'span',
                    value: '',
                    children: [
                      {
                        tag: 'a',
                        value: 'Genesis Website',
                        props: {
                          href: 'https://www.genesislrt.com/app/dashboard',
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
              {
                tag: 'li',
                value: '',
                children: [
                  {
                    tag: '',
                    value: 'You can also check your asset through ',
                  },
                  {
                    tag: 'span',
                    value: '',
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
                  {
                    tag: '',
                    value: '.',
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
        value: 'Extra 20% GenesisLRT points (for the $genETH we stake)',
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
  {
    tag: 'h3',
    value: 'Batch Details',
  },
  {
    tag: 'ul',
    children: [
      {
        tag: 'li',
        value: 'Stake ETH on Genesis',
      },
      {
        tag: 'li',
        value: 'Approve $genETH to provide liquidity',
      },
      {
        tag: 'li',
        value: 'Stake ETH on Lido',
      },
      {
        tag: 'li',
        value: 'Approve to wrap $stETH',
      },
      {
        tag: 'li',
        value: 'Wrap $stETH to $wstETH',
      },
      {
        tag: 'li',
        value: 'Approve $wstETH to provide liquidity',
      },
      {
        tag: 'li',
        value: 'Add $wstETH and $genETH to UniswapV3 liquidity pool',
      },
    ],
  },
]

export default BATCH_DETAILS
