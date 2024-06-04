import { Abi, Address, Chain, encodeFunctionData, erc20Abi, formatUnits } from "viem"
import { PreviewTx, Tx } from "../types"
import TokenizedStrategy from "./abi/TokenizedStrategy.json"
import { getDecimals } from "../utils"

export const protocolName = 'Yearn V3'

/**
 * Create a preview tx for depositing to Yearn v3.
 * @param tokenName The name of the token to display.
 * @param vaultAddress The address of the yearn v3 vault.
 * @returns PreviewTx
 */
export const depositPreviewTx = ({
  tokenName,
  vaultAddress
}: {
  tokenName: string
  vaultAddress: Address
}): PreviewTx => {
  return {
    name: `Deposit`,
    description: `${tokenName} to vault on Yearn V3`,
    to: vaultAddress,
    meta: {
      highlights: [protocolName],
    },
  }
}

/**
 * Create a tx for depositing token to Yearn v3 vault.
 * @param chain Chain to get decimal from.
 * @param tokenName The name of the token to display.
 * @param vaultAddress The address of the yearn v3 vault.
 * @param amount The amount to deposit into the yearn v3 vault.
 * @param receiverAddress The address that receive the vault token.
 * @returns Promise of Tx
 */
export const depositTx = async (param: {
  chain: Chain,
  tokenName: string,
  vaultAddress: Address,
  amount: bigint,
  receiverAddress: Address
}): Promise<Tx> => {

  const decimals = await getDecimals(param.vaultAddress, param.chain)

  return {
    name: `Deposit`,
    description: `${formatUnits(param.amount, decimals)} ${param.tokenName} to vault on ${protocolName}`,
    to: param.vaultAddress,
    value: 0n,
    data: encodeFunctionData({
      abi: TokenizedStrategy,
      functionName: 'deposit',
      args: [param.amount, param.receiverAddress],
    }),
    abi: TokenizedStrategy as Abi,
    meta: {
      highlights: [protocolName],
    },
  }
}