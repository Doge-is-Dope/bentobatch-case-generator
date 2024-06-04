import { Abi, Address, encodeAbiParameters, encodeFunctionData, formatEther } from "viem"
import { PreviewTx, Tx } from "../types"
import { ReferalAccount } from "../constants"
import zora from "../abi/zora.json"

export const defaultNFTMintingMessage = 'Minted with BentoBatch 🍱!'

/**
* The Required info to mint NFT on Zora
* only support method mintWithRewards for now
* @param creatorAddress The address of the contract to interact with.
* @param minterAddress One of the argument of function mintWithRewards.
* @param tokenId Id for the NFT. One of the argument of function mintWithRewards.
* @param quantity Quantity of NFT to mint.
* @param receiverAddress Receiver's address to receive the NFT.
* @param nftName Name of the NFT for display purpose.
* @param nftPriceInETH Amount of ETH to mint the NFT.
* @param chainName Name of the chain to mint the NFT.
* @return Promise of Tx
*/
export type ZoraNFT = {
  creatorAddress: Address,
  minterAddress: Address,
  tokenId: bigint,
  quantity: bigint,
  receiverAddress: Address,
  nftName: string,
  nftPriceInETH: bigint,
  chainName: string,
  comment: string,
}

export const mintNFTPreviewTx = (
  nftName: string,
  price: string,
  tokenToBuy: string, // ETH or erc20
  to: Address,
  platform: string,
): PreviewTx => {
  return {
    name: "Mint",
    description: `NFT ${nftName} with ${price} ${tokenToBuy} on ${platform}`,
    to,
    meta: {
      highlights: [nftName, platform]
    }
  }
}

/**
* Mint NFT on Zora
* only support method mintWithRewards for now
* @param {*} param The info of the contract to interact with.
* @return Promise of Tx
*/
export const mintNFTTx: (param: ZoraNFT) => Tx = (param: ZoraNFT) => {
  const { creatorAddress, minterAddress, tokenId, quantity, receiverAddress, nftName, nftPriceInETH, chainName, comment } = param

  const encodeData = encodeAbiParameters([
    { type: 'address' },
    { type: 'string' },
  ], [
    receiverAddress,
    comment,
  ])

  return {
    name: 'Mint',
    description: `${quantity} NFT ${nftName} with ${formatEther(nftPriceInETH)} ETH on ${chainName}`,
    to: creatorAddress,
    value: nftPriceInETH,
    data: encodeFunctionData({
      abi: zora as Abi,
      functionName: 'mintWithRewards',
      args: [
        minterAddress,
        tokenId,
        quantity,
        encodeData,
        ReferalAccount,
      ],
    }),
    abi: zora as Abi,
    meta: {
      highlights: [nftName, chainName]
    },
  }
}