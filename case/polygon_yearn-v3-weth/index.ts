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

import WETH_BATCH_DETAILS, {
  CASE_PROTOCOLS as WETH_CASE_PROTOCOLS,
  ATTRIBUTES as WETH_ATTRIBUTES,
} from "./weth.details";

const buildYearnV3VaultCase = (
  id: string,
  name: string,
  description: string,
  details: IHTMLStructure[],
  protocols: Protocol[],
  attributes: IAttribute[],
  tags: Tag[],
  blockchain: Chain,
  tokenName: string,
  tokenDecimals: number,
  tokenContract: Address,
  vaultName: string,
  vaultContract: Address,
  actionUrl: string
): BatchCase => {
  return {
    id: id,
    name: name,
    description: description,
    details,
    protocols,
    attributes,
    website: {
      title: "Yearn.Fi",
      url: "https://yearn.fi",
    },
    tags,
    curatorTwitter: {
      name: "Bento Batch 🍱",
      url: "https://x.com/bentobatch",
    },
    networkId: blockchain.id,
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
};

const caseApproveAndDepositYearnV3WETH: BatchCase = buildYearnV3VaultCase(
  "yearn_v3_weth",
  "Yield farming on Yearn with WETH",
  "Deposit WETH to Yearn finance’s V3 Vault. Auto compound and yeild high APY% with WETH.",
  WETH_BATCH_DETAILS,
  WETH_CASE_PROTOCOLS,
  WETH_ATTRIBUTES,
  [{ title: TagTitle.Defi }, { title: TagTitle.Yield }],
  polygon,
  "WETH",
  18,
  "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
  "WETH-A",
  "0x305F25377d0a39091e99B975558b1bdfC3975654",
  "https://yearn.fi/v3/137/0x305F25377d0a39091e99B975558b1bdfC3975654?action=withdraw"
);
const yearnCases: BatchCase[] = [caseApproveAndDepositYearnV3WETH];

export default yearnCases;
