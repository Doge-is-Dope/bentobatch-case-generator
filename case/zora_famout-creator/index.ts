import {
  Context,
  BatchCase,
  Tx,
  TagTitle,
  InputType,
  WalletType,
} from '@/models/cases/v3/types'
import {
  ZoraNFT,
  mintNFTTx,
  defaultNFTMintingMessage,
  mintNFTPreviewTx,
} from '../prebuilt-tx/zora'
import {
  Abi,
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  formatEther,
  getContract,
  http,
  parseEther,
} from 'viem'
import ZoraABI from '../abi/zora.json'
import minter from './abi/zora/minter.json'
import { ReferalAccount } from '../constants'
import { integerValidator } from '../utils'
import { zora } from 'viem/chains'
import BATCH_DETAILS from './famousCreator.detail'

const tags = [{ title: TagTitle.NFT }]
const goldenHourName = '✨ golden hour ✨'
const goldenHourCreatorAddress = '0xe019216b8c0cf7bd6df27de3c9b1d23ef985fd60'
const oneName = 'one'
const oneCreatorAddress = '0x96f21c95de1abc90959dd5aa70aec1e0e5e2c2b4'

const nftMintingPriceInETH = parseEther('0.000777')
const batchPriceInETH = nftMintingPriceInETH * 2n

const famousCreator: BatchCase = {
  id: 'zora_famous_creators',
  name: 'Famous Creator Collections',
  description: `Trending on Zora! Get Creator's retweeted collection in this batch - Mint it before it's ended!`,
  details: BATCH_DETAILS,
  website: {
    title: 'Zora',
    url: 'https://zora.co/',
  },
  tags,
  curatorTwitter: {
    name: 'Bento Batch 🍱',
    url: 'https://x.com/bentobatch',
  },
  networkId: zora.id, // Zora
  atomic: false,
  renderExpiry: undefined,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: 'Batch Amount',
      inputType: InputType.Text,
      description: 'How many times do you want to mint these two NFTs?',
      validate: integerValidator,
    },
  ],
  render: async (context: Context) => {
    /*
    WARNING: when inputs are configured with an input that includes `isOptional: true`,
    make sure to handle the case where the correspond value in inputs may be undefined
    `context.inputs as string[]` only suitable for inputs that are not configured with `isOptional: true`
    */
    const inputs = context.inputs as string[]
    const txs: Tx[] = []
    if (!context.account.address)
      throw new Error('Please connect your wallet first')
    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    })
    const ethBalance = await client.getBalance({
      address: context.account.address,
    })
    const loopAmount = inputs[0]
    const totalPriceInETH = batchPriceInETH * BigInt(loopAmount)
    if (totalPriceInETH > ethBalance)
      throw new Error(
        `ETH balance is not enough, you need at least ${formatEther(totalPriceInETH)} ETH`
      )

    const goldenHourMinterAddress = '0x04E2516A2c207E84a1839755675dfd8eF6302F0a'
    const mintPriceInETH = 777000000000000n

    const encodeData = encodeAbiParameters(
      [{ type: 'address' }, { type: 'string' }],
      [context.account.address, defaultNFTMintingMessage]
    )

    const singleNFTPriceInETH = mintPriceInETH * BigInt(loopAmount)
    txs.push({
      name: 'Mint',
      description: `${loopAmount} NFT ${goldenHourName} with ${formatEther(singleNFTPriceInETH)} ETH on Zora`,
      to: goldenHourCreatorAddress,
      value: singleNFTPriceInETH,
      data: encodeFunctionData({
        abi: ZoraABI as Abi,
        functionName: 'mint',
        args: [
          goldenHourMinterAddress,
          1n,
          BigInt(loopAmount),
          [ReferalAccount],
          encodeData,
        ],
      }),
      abi: ZoraABI as Abi,
      meta: {
        highlights: [goldenHourName, 'Zora'],
      },
    })

    const oneMinterAddress = '0x04E2516A2c207E84a1839755675dfd8eF6302F0a'
    const oneTokenId = 15n

    const oneMinterContract = getContract({
      address: oneMinterAddress,
      abi: minter as Abi,
      client: client,
    })
    const { saleEnd } = (await oneMinterContract.read.sale([
      oneCreatorAddress,
      oneTokenId,
    ])) as { saleEnd: bigint }
    const currentTimestamp = BigInt(Math.floor(new Date().getTime() / 1000))
    if (saleEnd < currentTimestamp)
      throw new Error(`NFT ${oneName} minting is expired.`)

    const one: ZoraNFT = {
      creatorAddress: oneCreatorAddress,
      minterAddress: oneMinterAddress,
      tokenId: oneTokenId,
      quantity: BigInt(loopAmount),
      receiverAddress: context.account.address,
      nftName: oneName,
      nftPriceInETH: singleNFTPriceInETH,
      chainName: 'Zora',
      comment: defaultNFTMintingMessage,
    }
    txs.push(mintNFTTx(one))

    return txs
  },
  previewTx: [
    mintNFTPreviewTx(
      goldenHourName,
      '0.000777',
      'ETH',
      goldenHourCreatorAddress,
      'Zora'
    ),
    mintNFTPreviewTx(oneName, '0.000777', 'ETH', oneCreatorAddress, 'Zora'),
  ],
  setActions: () => {
    return [
      {
        href: 'https://opensea.io/account/private',
        text: 'Opensea',
      },
    ]
  },
}

export default famousCreator
