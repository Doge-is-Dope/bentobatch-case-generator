const BATCH_DETAILS = [
  { tag: 'h2', value: 'Date & Time' },
  {
    tag: 'ul',
    children: [
      {
        tag: 'li',
        value: '~5/8 2:45 PM UTC + 8',
        children: [
          { tag: 'br' },
          {
            tag: '',
            value:
              "Note: After 2:45 PM UTC + 8 on May 8, you won't be able to mint any more.",
          },
        ],
      },
    ],
  },
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
                  'Ensure you have at least 0.001554 ETH in your Blocto Wallet. Your wallet address can be found in the top right corner.',
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
            value: 'Step3: Enter Batch Amount',
          },
          {
            tag: 'ul',
            children: [
              {
                tag: 'li',
                value: 'Specify the amount of batch to mint',
                children: [
                  {
                    tag: 'ul',
                    children: [
                      {
                        tag: 'li',
                        value:
                          'With one batch, you will receive golden hour + "one" NFT.',
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
    ],
  },
  {
    tag: 'h3',
    value: 'NFT you will get',
  },
  {
    tag: 'ul',
    children: [
      {
        tag: 'li',
        children: [
          {
            tag: 'a',
            value: '✨ golden hour ✨',
            props: {
              href: 'https://zora.co/collect/zora:0xe019216b8c0cf7bd6df27de3c9b1d23ef985fd60/1',
              target: '_blank',
              rel: 'noopener noreferrer nofollow',
            },
          },
        ],
      },
      {
        tag: 'li',
        children: [
          {
            tag: 'a',
            value: 'one',
            props: {
              href: 'https://zora.co/collect/zora:0x96f21c95de1abc90959dd5aa70aec1e0e5e2c2b4/15',
              target: '_blank',
              rel: 'noopener noreferrer nofollow',
            },
          },
        ],
      },
    ],
  },
]

export default BATCH_DETAILS
