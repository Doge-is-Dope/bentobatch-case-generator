import { Context, BatchCase, TagTitle, Tx, InputType, WalletType } from "@/cases/types";
import { balance, decimalValidator, max } from "@/models/cases/v3/utils";
import { parseUnits } from "viem";
import { BATCH_DETAILS, ATTRIBUTES, CASE_PROTOCOLS } from "./morpho.details";
import { mainnet } from "viem/chains";
import { AddressNotFoundError } from "../error";
import { depositPreviewTx, depositEthMulticallTx } from "../prebuilt-tx/morpho";

const inputTokenSymbol = "ETH";
const morphoVault = "0x78Fc2c2eD1A4cDb5402365934aE5648aDAd094d0";
const vaultName = "Re7 WETH";
const morphoPageLink = "https://app.morpho.org/vault?vault=0x78Fc2c2eD1A4cDb5402365934aE5648aDAd094d0";
const txCount = 1;

const tags = [
  { title: TagTitle.Defi },
  { title: TagTitle.Staking },
  { title: TagTitle.Restaking },
  { title: TagTitle.Lending },
];

const re7WethCase: BatchCase = {
  id: "morpho_re7_weth",
  name: "Morpho Series - One click to deposit on Re7 WETH Vault",
  description: "One Click to earn lending APY and USDC, $BRTFLY, $RSR, wstETH, $MORPHO rewards by Morpho’s strategy.",
  details: BATCH_DETAILS({
    inputTokenSymbol,
    performanceFeePercentage: 20,
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
      name: "ETH Amount",
      inputType: InputType.NativeAmount,
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

    const inputAmount = parseUnits(context.inputs[0] as string, 18);

    const tx = await depositEthMulticallTx({
      chain: context.chain,
      inputAmount,
      morphoVault,
      vaultName,
      userAddress,
    });
    txs.push(tx);
    return txs;
  },
  previewTx: [
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

export default [re7WethCase];
