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
  formatEther,
  getContract,
  http,
  parseEther,
} from 'viem'
import { integerValidator } from '../utils'
import { zora } from 'viem/chains'
import BATCH_DETAILS from './mostMinted.detail'
import minter from './abi/zora/minter.json'

const tags = [{ title: TagTitle.NFT }]

const elevenName = '11:11'
const eleventCreatorAddress = '0x051580e8a6da31c4bb48d02f3c22f1e99080b0f3'
const itsAFeelingName = "It's a feeling."
const itsAFeelingCreatorAddress = '0x0bd0e83cbb9fb191daef14702a8c9fc3575a6ea8'

const nftMintingPriceInETH = parseEther('0.000777')
const batchPriceInETH = nftMintingPriceInETH * 2n

const mostMinted: BatchCase = {
  id: 'zora_most_minted',
  name: 'Grab the Most Popular NFT on Zora',
  description: `Imagine.zora.eth's latest NFT package is here - Batch the mint with ease and cheap!`,
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

    const eleventMinterAddress = '0x04E2516A2c207E84a1839755675dfd8eF6302F0a'
    const eleventTokenId = 3n
    const eleventMinterContract = getContract({
      address: eleventMinterAddress,
      abi: minter as Abi,
      client: client,
    })
    const { saleEnd: eleventSaleEnd } = (await eleventMinterContract.read.sale([
      eleventCreatorAddress,
      eleventTokenId,
    ])) as { saleEnd: bigint }
    const currentTimestamp = BigInt(Math.floor(new Date().getTime() / 1000))
    if (eleventSaleEnd < currentTimestamp)
      throw new Error(`NFT ${elevenName} minting is expired.`)

    const elevent: ZoraNFT = {
      creatorAddress: eleventCreatorAddress,
      minterAddress: eleventMinterAddress,
      tokenId: eleventTokenId,
      quantity: BigInt(loopAmount),
      receiverAddress: context.account.address,
      nftName: elevenName,
      nftPriceInETH: nftMintingPriceInETH * BigInt(loopAmount),
      chainName: 'Zora',
      comment: defaultNFTMintingMessage,
    }

    const itsAFeelingMinterAddress =
      '0x04E2516A2c207E84a1839755675dfd8eF6302F0a'
    const itsAFeelingTokenId = 1n
    const itsAFeelingMinterContract = getContract({
      address: itsAFeelingMinterAddress,
      abi: minter as Abi,
      client: client,
    })
    const { saleEnd: itsAFeelingSaleEnd } =
      (await itsAFeelingMinterContract.read.sale([
        itsAFeelingCreatorAddress,
        itsAFeelingTokenId,
      ])) as { saleEnd: bigint }

    if (itsAFeelingSaleEnd < currentTimestamp)
      throw new Error(`NFT ${itsAFeelingName} minting is expired.`)

    const itsAFeeling: ZoraNFT = {
      creatorAddress: itsAFeelingCreatorAddress,
      minterAddress: '0x04E2516A2c207E84a1839755675dfd8eF6302F0a',
      tokenId: itsAFeelingTokenId,
      quantity: BigInt(loopAmount),
      receiverAddress: context.account.address,
      nftName: itsAFeelingName,
      nftPriceInETH: nftMintingPriceInETH * BigInt(loopAmount),
      chainName: 'Zora',
      comment: defaultNFTMintingMessage,
    }

    const nfts: ZoraNFT[] = [elevent, itsAFeeling]

    for (const nft of nfts) {
      txs.push(mintNFTTx(nft))
    }

    return txs
  },
  previewTx: [
    mintNFTPreviewTx(
      elevenName,
      '0.000777',
      'ETH',
      eleventCreatorAddress,
      'Zora'
    ),
    mintNFTPreviewTx(
      itsAFeelingName,
      '0.000777',
      'ETH',
      itsAFeelingCreatorAddress,
      'Zora'
    ),
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

export default mostMinted
