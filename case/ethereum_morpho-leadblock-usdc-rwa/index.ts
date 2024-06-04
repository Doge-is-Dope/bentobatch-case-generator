import { Context, BatchCase, TagTitle, Tx, InputType, WalletType } from "@/cases/types";
import { balance, decimalValidator, getDecimals, max } from "@/models/cases/v3/utils";
import { parseUnits } from "viem";
import { BATCH_DETAILS, ATTRIBUTES, CASE_PROTOCOLS } from "./morpho.details";
import { mainnet } from "viem/chains";
import { AddressNotFoundError } from "../error";
import { depositPreviewTx, ethereumBundlerV2, erc4626DepositCallData, wrapToMulticallTx } from "../prebuilt-tx/morpho";
import { transferPreviewTx, transferTx } from "../prebuilt-tx/ERC20";

const inputTokenSymbol = "USDC";
const inputTokenAddr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const morphoVault = "0x4cA0E178c94f039d7F202E09d8d1a655Ed3fb6b6";
const vaultName = "LeadBlock USDC RWA";
const morphoPageLink = "https://app.morpho.org/vault?vault=0x4cA0E178c94f039d7F202E09d8d1a655Ed3fb6b6";
const txCount = 2;

const tags = [{ title: TagTitle.Defi }, { title: TagTitle.RWA }];

const leadblockUsdcRwaCase: BatchCase = {
  id: "morpho_leadblock_usdc_rwa",
  name: "Morpho Series - One click to deposit on LeadBlock USDC RWA Vault",
  description: "One Click to earn lending APY and USDC, $MORPHO rewards by Morpho’s strategy.",
  details: BATCH_DETAILS({
    inputTokenSymbol,
    performanceFeePercentage: 5,
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
      name: "USDC Amount",
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

    const usdcDecimals = await getDecimals(inputTokenAddr, context.chain);

    const inputAmount = parseUnits(context.inputs[0] as string, usdcDecimals);

    const transferUsdtTx = transferTx({
      userAddress,
      receiver: ethereumBundlerV2,
      tokenSymbol: inputTokenSymbol,
      tokenAddress: inputTokenAddr,
      tokenAmount: inputAmount,
      tokenDecimals: usdcDecimals,
    });
    txs.push(transferUsdtTx);

    const depositCallData = await erc4626DepositCallData({
      chain: context.chain,
      inputToken: {
        symbol: inputTokenSymbol,
        inputAmount,
        decimals: usdcDecimals,
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
          decimals: usdcDecimals,
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

export default [leadblockUsdcRwaCase];
