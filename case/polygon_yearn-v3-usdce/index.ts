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

import USDCE_BATCH_DETAILS, {
  CASE_PROTOCOLS as USDCE_CASE_PROTOCOLS,
  ATTRIBUTES as USDCE_ATTRIBUTES,
} from "./usdce.details";

const buildYearnV3VaultCase = (): BatchCase => {
  const tokenName = "USDC.e";
  const tokenDecimals = 6;
  const tokenContract = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  const vaultName = "USDC.e-A";
  const vaultContract = "0xA013Fbd4b711f9ded6fB09C1c0d358E2FbC2EAA0";

  return {
    id: "yearn_v3_usdce",
    name: "Yield farming on Yearn with USDC.e",
    description: "Deposit USDC.e to Yearn finance’s V3 Vault. Auto compound and yeild high APY% with USDC.e",
    details: USDCE_BATCH_DETAILS,
    protocols: USDCE_CASE_PROTOCOLS,
    attributes: USDCE_ATTRIBUTES,
    website: {
      title: "Yearn.Fi",
      url: "https://yearn.fi",
    },
    tags: [{ title: TagTitle.Defi }, { title: TagTitle.Yield }],
    curatorTwitter: {
      name: "Bento Batch 🍱",
      url: "https://x.com/bentobatch",
    },
    networkId: polygon.id,
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
          href: "https://yearn.fi/v3/137/0xA013Fbd4b711f9ded6fB09C1c0d358E2FbC2EAA0?action=withdraw",
          text: "Manage Assets (Yearn)",
        },
      ];
    },
  };
};

export default { buildYearnV3VaultCase };
