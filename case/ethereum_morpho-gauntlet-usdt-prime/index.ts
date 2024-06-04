import { Context, BatchCase, TagTitle, Tx, InputType, WalletType } from "@/cases/types";
import { balance, decimalValidator, getDecimals, max } from "@/models/cases/v3/utils";
import { parseUnits } from "viem";
import { BATCH_DETAILS, ATTRIBUTES, CASE_PROTOCOLS } from "./morpho.details";
import { mainnet } from "viem/chains";
import { AddressNotFoundError } from "../error";
import { depositPreviewTx, ethereumBundlerV2, erc4626DepositCallData, wrapToMulticallTx } from "../prebuilt-tx/morpho";
import { transferPreviewTx, transferTx } from "../prebuilt-tx/ERC20";

const inputTokenSymbol = "USDT";
const inputTokenAddr = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const morphoVault = "0x8CB3649114051cA5119141a34C200D65dc0Faa73";
const vaultName = "Gauntlet USDT Prime";
const morphoPageLink = "https://app.morpho.org/vault?vault=0x8CB3649114051cA5119141a34C200D65dc0Faa73";
const txCount = 2;

const tags = [{ title: TagTitle.Defi }, { title: TagTitle.Lending }];

const gauntletUsdtPrimeCase: BatchCase = {
  id: "gauntlet_usdt_prime",
  name: "Morpho Series - One click to deposit on Gauntlet USDT Prime Vault",
  description: "One Click to earn lending APY and USDC, $MORPHO rewards by Morpho’s strategy.",
  details: BATCH_DETAILS({
    inputTokenSymbol,
    performanceFeePercentage: 0,
    morphoPageLink,
    txCount,
  }),
  website: {
    title: "Morpho Labs",
    url: "https://twitter.com/MorphoLabs",
  },
  tags,
  curatorTwitter: {
    name: "Bento Batch 🍱",
    url: "https://x.com/bentobatch",
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES(txCount),
  networkId: mainnet.id,
  atomic: true,
  renderExpiry: undefined,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: "USDT Amount",
      inputType: InputType.ERC20Amount,
      options: {
        token: inputTokenAddr,
      },
      description: "Amount to stake",
      validate: decimalValidator(6, BigInt(0)),
      actionButtons: [max],
      actionContent: balance,
    },
  ],
  render: async (context: Context) => {
    let txs: Tx[] = [];

    const userAddress = context.account.address;
    if (!userAddress) throw new AddressNotFoundError();

    const usdtDecimals = await getDecimals(inputTokenAddr, context.chain);

    const inputAmount = parseUnits(context.inputs[0] as string, usdtDecimals);

    const transferUsdtTx = transferTx({
      userAddress,
      receiver: ethereumBundlerV2,
      tokenSymbol: inputTokenSymbol,
      tokenAddress: inputTokenAddr,
      tokenAmount: inputAmount,
      tokenDecimals: usdtDecimals,
    });
    txs.push(transferUsdtTx);

    const depositCallData = await erc4626DepositCallData({
      chain: context.chain,
      inputToken: {
        symbol: inputTokenSymbol,
        inputAmount,
        decimals: usdtDecimals,
      },
      morphoVault,
      userAddress,
    });

    txs.push(
      wrapToMulticallTx({
        calldatas: [depositCallData],
        ethValue: 0n,
        inputToken: {
          symbol: inputTokenSymbol,
          inputAmount: inputAmount,
          decimals: usdtDecimals,
        },
        vaultName,
      })
    );

    return txs;
  },
  previewTx: [
    transferPreviewTx({
      receiver: ethereumBundlerV2,
      tokenSymbol: inputTokenSymbol,
      tokenAddress: inputTokenAddr,
    }),
    depositPreviewTx({
      inputTokenSymbol,
      vaultName: vaultName,
    }),
  ],
  setActions: () => {
    return [
      {
        href: morphoPageLink,
        text: "Manage Position (Morpho)",
      },
    ];
  },
};

export default [gauntletUsdtPrimeCase];
