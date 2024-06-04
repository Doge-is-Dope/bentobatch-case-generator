import { Abi, Address, Chain, createPublicClient, decodeFunctionData, encodeFunctionData, formatUnits, getAbiItem, getContract, http } from "viem"
import { balanceOf } from "./ERC20"
import { PreviewTx, Tx } from "../types"
import EthereumBundlerV2 from './abi/EthereumBundlerV2.json'
import MetaMorpho from './abi/MetaMorpho.json'
import { Rounding, mulDivWithRounding } from "../math"

export const ethereumBundlerV2 = "0x4095F064B8d3c3548A3bebfd0Bbfd04750E30077"

export const protocolName = 'Morpho Blue'

/**
 * symbol: The name of token. Used for display.
 * inputAmount: The input amount of token.
 * decimals: The decimals of token.
 */
export type InputToken = {
  symbol: string
  inputAmount: bigint
  decimals: number
}

/**
 * Create preview tx for depositing token to Morpho vault.
 * @param inputTokenSymbol The name of input token. e.g. ETH
 * @param vaultName The name of the Morpho vault. e.g. Gauntlet LRT Core
 * @returns PreviewTx
 */
export const depositPreviewTx = ({
  inputTokenSymbol,
  vaultName,
}: {
  inputTokenSymbol: string
  vaultName: string
}): PreviewTx => {
  return {
    name: 'Deposit',
    description: `${inputTokenSymbol} to ${vaultName} on ${protocolName}`,
    to: ethereumBundlerV2,
    meta: {
      highlights: [protocolName],
    }
  }
}

/**
 * Get vault address from the multicall call data for develop purpose.
 * @param multicallData The call data of transaction initiated from Morpho website.
 * @returns Address
 */
export const getVaultAddress = (multicallData: `0x${string}`): Address | undefined => {
  const decodedFnData = decodeFunctionData({
    abi: EthereumBundlerV2,
    data: multicallData
  }) as any

  let vaultAddress = undefined

  for (const arg of decodedFnData.args[0]) {
    const decodedFnData = decodeFunctionData({
      abi: EthereumBundlerV2,
      data: arg
    })
    const abiItem = getAbiItem({
      abi: EthereumBundlerV2,
      name: decodedFnData.functionName
    }) as any
    (abiItem.inputs as any[]).forEach((element, index) => {
      if (element.name === 'vault') {
        vaultAddress = decodedFnData.args?.[index] as Address
      }
    });
  }
  return vaultAddress
}

/**
 * Create a tx for depositing token to Morpho erc4626 vault.
 * @param chain The chain that interacting with.
 * @param inputToken The info of input token.
 * @param morphoVault The vault address of Morpho, can be got from the getVaultAddress above.
 * @param vaultName The name of the current vault, used to display for the user.
 * @param userAddress The user's address.
 * @returns Tx
 */
export const erc4626DepositCallData = async ({
  chain,
  inputToken,
  morphoVault,
  userAddress,
}: {
  chain: Chain
  inputToken: InputToken
  morphoVault: Address
  userAddress: Address
}): Promise<string> => {
  const client = createPublicClient({
    chain,
    transport: http(),
  })

  const vaultContract = getContract({
    address: morphoVault,
    abi: MetaMorpho,
    client: client
  })

  const assetAddress = await vaultContract.read.asset() as Address
  const vaultAssetBalance = await balanceOf({
    chain,
    userAddress: morphoVault,
    tokenAddress: assetAddress
  })

  // Fetch the total supply of the vault tokens
  const totalSupply = await vaultContract.read.totalSupply() as bigint
  const decimalsOffset = await vaultContract.read.DECIMALS_OFFSET() as number
  const totalAssets = await vaultContract.read.totalAssets() as bigint

  const minShares = calculateMinShares({
    assetBalance: vaultAssetBalance,
    inputAmount: inputToken.inputAmount,
    totalSupply,
    newTotalAssets: totalAssets,
    decimalsOffset
  })
  const erc4626DepositCalldata = encodeFunctionData({
    abi: EthereumBundlerV2,
    functionName: 'erc4626Deposit',
    args: [
      morphoVault,
      inputToken.inputAmount,
      minShares,
      userAddress
    ],
  })
  return erc4626DepositCalldata
}

/**
 * Create a multicall tx for depositing token to Morpho vault.
 * @param chain The chain that interacting with.
 * @param inputToken The info of input token.
 * @param morphoVault The vault address of Morpho, can be got from the getVaultAddress above.
 * @param vaultName The name of the current vault, used to display for the user.
 * @param userAddress The user's address.
 * @returns Tx
 */
export const depositEthMulticallTx = async ({
  chain,
  inputAmount,
  morphoVault,
  vaultName,
  userAddress,
}: {
  chain: Chain
  inputAmount: bigint
  morphoVault: Address
  vaultName: string
  userAddress: Address
}): Promise<Tx> => {

  const wrapNativeCalldata = encodeFunctionData({
    abi: EthereumBundlerV2,
    functionName: 'wrapNative',
    args: [inputAmount],
  })

  const inputToken: InputToken = {
    symbol: 'ETH',
    inputAmount,
    decimals: 18
  }

  const depositCalldata = await erc4626DepositCallData({
    chain,
    inputToken,
    morphoVault,
    userAddress,
  })

  return wrapToMulticallTx({
    calldatas: [
      wrapNativeCalldata,
      depositCalldata,
    ],
    ethValue: inputAmount,
    inputToken,
    vaultName,
  })
}

/**
 * Wrap calldata into a multicall Tx.
 * Since the modifier protected will check whether _initiator is UNINITIATED, we need to use multicall instead of calling the erc4626Deposit directly.
 * @param calldatas The call data array wants to put into the multicall.
 * @param ethValue The transaction value of the multicall.
 * @param inputToken The info of input token.
 * @param vaultName The name of the current vault, used to display for the user.
 * @returns Tx
 */
export const wrapToMulticallTx = ({
  calldatas,
  ethValue,
  inputToken,
  vaultName,
}: {
  calldatas: string[],
  ethValue: bigint,
  inputToken: InputToken
  vaultName: string
}): Tx => {

  return {
    name: 'Deposit',
    description: `${formatUnits(inputToken.inputAmount, inputToken.decimals)} ${inputToken.symbol} to ${vaultName} on ${protocolName}`,
    to: ethereumBundlerV2,
    value: ethValue,
    data: encodeFunctionData({
      abi: EthereumBundlerV2,
      functionName: 'multicall',
      args: [
        calldatas
      ],
    }),
    abi: EthereumBundlerV2 as Abi,
    meta: {
      highlights: [
        protocolName
      ]
    }
  }
}

const calculateMinShares = ({
  assetBalance,
  inputAmount,
  totalSupply,
  newTotalAssets,
  decimalsOffset,
}: {
  assetBalance: bigint,
  inputAmount: bigint,
  totalSupply: bigint,
  newTotalAssets: bigint,
  decimalsOffset: number
}): bigint => {
  let amountAsset = inputAmount;

  if (amountAsset > assetBalance) {
    amountAsset = assetBalance;
  }

  // Calculate the shares
  const shares = convertToSharesWithTotals(inputAmount, totalSupply, newTotalAssets, decimalsOffset, Rounding.Floor);

  // close to the buffer get from Morpho frontend.
  const minShares = shares * 9997n / 10000n
  if (shares * inputAmount < amountAsset * minShares) throw new Error(`The share has changed, please try again.`)

  return minShares;
};

const convertToSharesWithTotals = (
  assets: bigint,
  totalSupply: bigint,
  newTotalAssets: bigint,
  decimalsOffset: number,
  rounding: Rounding
): bigint => {
  const denominator = newTotalAssets + 1n;

  const result = mulDivWithRounding(assets, totalSupply + BigInt(10 ** decimalsOffset), denominator, rounding)
  return result
};