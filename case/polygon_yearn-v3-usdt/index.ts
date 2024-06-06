import type { Abi, Address } from "abitype";
import { Chain, polygon } from "wagmi/chains";
import { parseEther, parseUnits, encodeFunctionData, erc20Abi } from "viem";

import {
  Context,
  BatchCase,
  InputType,
  Tag,
  Tx,
  TagTitle,
  WalletType,
  IHTMLStructure,
  Protocol,
  IAttribute,
} from "@/models/cases/v3/types";
import { balance, decimalValidator, max } from "@/models/cases/v3/utils";
import YearnV3Vault from "./abi/YearnV3Vault.json";

import USDT_BATCH_DETAILS, {
  CASE_PROTOCOLS as USDT_CASE_PROTOCOLS,
  ATTRIBUTES as USDT_ATTRIBUTES,
} from "./usdt.details";

const tokenName = "USDT";
const tokenDecimals = 6;
const tokenContract = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const vaultName = "USDT-A";
const vaultContract = "0xBb287E6017d3DEb0e2E65061e8684eab21060123";
const actionUrl = "https://yearn.fi/v3/137/0xBb287E6017d3DEb0e2E65061e8684eab21060123?action=withdraw";

const yearnV3VaultCase: BatchCase = {
  id: "yearn_v3_usdt_a",
  name: "Yield farming on Yearn with USDT",
  description: "Deposit USDT to Yearn finance’s V3 Vault. Auto compound and yeild high APY% with USDT.",
  details: USDT_BATCH_DETAILS,
  protocols: USDT_CASE_PROTOCOLS,
  attributes: USDT_ATTRIBUTES,
  website: {
    title: "Yearn.Fi",
    url: "https://yearn.fi",
  },
  tags: [{ title: TagTitle.Defi }, { title: TagTitle.Yield }],
  curatorTwitter: {
    name: "Bento Batch 🍱",
    url: "https://x.com/bentobatch",
  },
  networkId: polygon,
  atomic: true,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: "Amount",
      inputType: InputType.ERC20Amount,
      description: "Amount to invest",
      validate: decimalValidator(tokenDecimals, BigInt(0)),
      options: {
        token: tokenContract,
      },
      actionContent: balance,
      actionButtons: [max],
    },
  ],
  render: async (context: Context) => {
    /*
    WARNING: when inputs are configured with an input that includes `isOptional: true`,
    make sure to handle the case where the correspond value in inputs may be undefined
    `context.inputs as string[]` only suitable for inputs that are not configured with `isOptional: true`
    */
    const inputs = context.inputs as string[];
    // parse amount to BigInt
    // 1. parse as float
    // 2. multiply by 10^6
    // 3. convert to BigInt
    let amountBN = parseUnits(inputs[0], tokenDecimals);

    let txs: Tx[] = [];
    // approve tx
    txs.push({
      name: `Approve`,
      description: `${vaultName} vault to spend ${tokenName} on Yearn V3`,
      to: tokenContract,
      value: BigInt(0),
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [vaultContract, amountBN],
      }),
      abi: erc20Abi,
      meta: {
        highlights: ["Yearn V3"],
      },
    });

    // deposit tx
    txs.push({
      name: `Deposit`,
      description: `${tokenName} to vault ${vaultName} on Yearn V3`,
      to: vaultContract,
      value: parseEther("0"),
      data: encodeFunctionData({
        abi: YearnV3Vault,
        functionName: "deposit",
        args: [amountBN, context.account.address],
      }),
      abi: YearnV3Vault as Abi,
      meta: {
        highlights: ["Yearn V3"],
      },
    });
    return txs;
  },
  previewTx: [
    {
      name: "Approve",
      description: `${tokenName} to Yearn V3`,
      to: tokenContract,
      meta: {
        highlights: ["Yearn V3"],
      },
    },
    {
      name: "Deposit",
      description: `${tokenName} to Yearn V3`,
      to: vaultContract,
      meta: {
        highlights: ["Yearn V3"],
      },
    },
  ],
  setActions: () => {
    return [
      {
        href: actionUrl,
        text: "Manage Assets (Yearn)",
      },
    ];
  },
};

export default { yearnV3VaultCase };
