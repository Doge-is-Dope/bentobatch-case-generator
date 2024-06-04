import { Context, BatchCase, TagTitle, Tx, InputType, WalletType } from "@/cases/types";
import { balance, decimalValidator, getDecimals, max } from "@/models/cases/v3/utils";
import { parseUnits } from "viem";
import { BATCH_DETAILS, ATTRIBUTES, CASE_PROTOCOLS } from "./morpho.details";
import { mainnet } from "viem/chains";
import { AddressNotFoundError } from "../error";
import { depositPreviewTx, ethereumBundlerV2, erc4626DepositCallData, wrapToMulticallTx } from "../prebuilt-tx/morpho";
import { transferPreviewTx, transferTx } from "../prebuilt-tx/ERC20";

const inputTokenSymbol = "DAI";
const inputTokenAddr = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const morphoVault = "0x500331c9fF24D9d11aee6B07734Aa72343EA74a5";
const vaultName = "Gauntlet DAI Core";
const morphoPageLink = "https://app.morpho.org/vault?vault=0x500331c9fF24D9d11aee6B07734Aa72343EA74a5";
const txCount = 2;

const tags = [{ title: TagTitle.Defi }, { title: TagTitle.Lending }];

const gauntletDaiCoreCase: BatchCase = {
  id: "gauntlet_dai_core",
  name: "Morpho Series - One click to deposit on Gauntlet DAI Core Vault",
  description: "One Click to earn lending DAI APY by Morpho’s strategy.",
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
      name: "Dai Amount",
      inputType: InputType.ERC20Amount,
      options: {
        token: inputTokenAddr,
      },
      description: "Amount to stake",
      validate: decimalValidator(18, BigInt(0)),
      actionButtons: [max],
      actionContent: balance,
    },
  ],
  render: async (context: Context) => {
    let txs: Tx[] = [];

    const userAddress = context.account.address;
    if (!userAddress) throw new AddressNotFoundError();

    const daiDecimals = await getDecimals(inputTokenAddr, context.chain);

    const inputAmount = parseUnits(context.inputs[0] as string, daiDecimals);

    const transferUsdtTx = transferTx({
      userAddress,
      receiver: ethereumBundlerV2,
      tokenSymbol: inputTokenSymbol,
      tokenAddress: inputTokenAddr,
      tokenAmount: inputAmount,
      tokenDecimals: daiDecimals,
    });
    txs.push(transferUsdtTx);

    const depositCallData = await erc4626DepositCallData({
      chain: context.chain,
      inputToken: {
        symbol: inputTokenSymbol,
        inputAmount,
        decimals: daiDecimals,
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
          decimals: daiDecimals,
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

export default [gauntletDaiCoreCase];
