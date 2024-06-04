const BATCH_DETAILS = [
  { tag: 'h2', value: 'Date & Time' },
  {
    tag: 'ul',
    children: [
      {
        tag: 'li',
        value: '~5/11 11:11 PM UTC + 8',
        children: [
          { tag: 'br' },
          {
            tag: '',
            value:
              "Note: After 11:11 PM UTC + 8 on May 11, you won't be able to mint any more.",
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
                          "With one batch, you will receive 11:11 + It's a feeling. NFT.",
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
            value: '11:11',
            props: {
              href: 'https://zora.co/collect/zora:0x051580e8a6da31c4bb48d02f3c22f1e99080b0f3/3',
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
            value: "It's a feeling.",
            props: {
              href: 'https://zora.co/collect/zora:0x0bd0e83cbb9fb191daef14702a8c9fc3575a6ea8/1',
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
