import PROTOCOLS_CONSTANT from '@/constants/protocols'
import { Protocol } from '@/cases/types'
import { attributesToHTMLStructure, protocolsToHTMLStructure } from '../utils'

export const CASE_PROTOCOLS = [Protocol.Yearn]
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
  { id: 'txn_count', name: 'TXN count', value: '1 ~ 4' },
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
            value: 'Step2: Enter Amount',
          },
          {
            tag: 'ul',
            children: [
              {
                tag: 'li',
                value: 'Specify the amount of fund you wish to withdraw.',
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
            value: 'Step3: Confirm Your Batch!',
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
                    value: 'You can check your asset through ',
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
              {
                tag: 'li',
                value: 'You can also find your asset in Blocto Wallet. ',
                children: [
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
