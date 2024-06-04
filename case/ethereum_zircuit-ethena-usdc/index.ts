import type { Abi } from "abitype";
import { Context, BatchCase, InputType, Tag, Tx, TagTitle, WalletType } from "@/models/cases/v3/types";
import { balance, decimalValidator, max } from "@/models/cases/v3/utils";
import { createPublicClient, getContract, http, encodeFunctionData, parseUnits, formatUnits } from "viem";
import USDC from "./abi/USDC.json";
import USDe from "./abi/USDe.json";
import CurveStableSwap from "./abi/CurveStableSwap.json";
import ZircuitRestakingPool from "./abi/ZircuitRestakingPool.json";
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from "./usdc.details";

const usdcAddr = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const usdeAddr = "0x4c9edd5852cd905f086c759e8383e09bff1e68b3";
const curveStableSwapAddr = "0x02950460E2b9529D0E00284A5fA2d7bDF3fA4d72";
const zircuitRestakingPoolAddr = "0xF047ab4c75cebf0eB9ed34Ae2c186f3611aEAfa6";

const tags = [
  { title: TagTitle.Official },
  { title: TagTitle.Benefits },
  { title: TagTitle.Defi },
  { title: TagTitle.Restaking },
];

const usdcCase: BatchCase = {
  id: "zircuit_ethena_usdc",
  name: "🔥 Earn extra 15% Zircuit Points with Ethena Restaking by USDC",
  description: "Swap USDC to USDe and deposit USDe on Zircuit in One Click.",
  details: BATCH_DETAILS,
  website: {
    title: "Zircuit",
    url: "https://www.zircuit.com/",
  },
  tags,
  curatorTwitter: {
    name: "Bento Batch 🍱",
    url: "https://x.com/bentobatch",
  },
  protocols: CASE_PROTOCOLS,
  attributes: ATTRIBUTES,
  networkId: 1,
  atomic: true,
  renderExpiry: undefined,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: "USDC Amount",
      inputType: InputType.ERC20Amount,
      description: "Amount to buy USDe",
      validate: decimalValidator(6, BigInt(0)),
      options: {
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
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
    const txs: Tx[] = [];

    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    });

    const usdc = getContract({
      address: usdcAddr,
      abi: USDC,
      client: client,
    });

    const usde = getContract({
      address: usdeAddr,
      abi: USDe,
      client: client,
    });

    const curveStableSwap = getContract({
      address: curveStableSwapAddr,
      abi: CurveStableSwap,
      client: client,
    });

    const zircuitRestakingPool = getContract({
      address: zircuitRestakingPoolAddr,
      abi: ZircuitRestakingPool,
      client: client,
    });

    const usdcAllowance = (await usdc.read.allowance([context.account.address, curveStableSwap.address])) as bigint;

    const usdcAmount = parseUnits(inputs[0], 6);

    if (usdcAmount > usdcAllowance) {
      txs.push({
        name: `Approve`,
        description: `${inputs[0]} USDC for Curve`,
        to: usdc.address,
        value: 0n,
        data: encodeFunctionData({
          abi: usdc.abi,
          functionName: "approve",
          args: [curveStableSwap.address, usdcAmount],
        }),
        abi: usdc.abi as Abi,
        meta: {
          highlights: ["Curve"],
        },
      });
    }

    const usdeAmount = (await curveStableSwap.read.get_dy([
      "1", // coins index of USDC
      "0", // coins index of USDe
      usdcAmount,
    ])) as bigint;

    const usdeFormatAmount = formatUnits(usdeAmount, 18);

    txs.push({
      name: `Swap`,
      description: `${inputs[0]} USDC to ${usdeFormatAmount} USDe`,
      to: curveStableSwap.address,
      value: 0n,
      data: encodeFunctionData({
        abi: curveStableSwap.abi,
        functionName: "exchange",
        args: [
          "1", // coins index of USDC
          "0", // coins index of USDe
          usdcAmount,
          usdeAmount,
        ],
      }),
      abi: curveStableSwap.abi as Abi,
    });

    const usdeAllowance = (await usde.read.allowance([context.account.address, zircuitRestakingPoolAddr])) as bigint;

    if (usdeAmount > usdeAllowance) {
      txs.push({
        name: `Approve`,
        description: `${usdeFormatAmount} USDe for Zircuit`,
        to: usde.address,
        value: 0n,
        data: encodeFunctionData({
          abi: usde.abi,
          functionName: "approve",
          args: [zircuitRestakingPoolAddr, usdeAmount],
        }),
        abi: usde.abi as Abi,
        meta: {
          highlights: ["Zircuit"],
        },
      });
    }

    txs.push({
      name: `Stake`,
      description: `${usdeFormatAmount} USDe to Zircuit`,
      to: zircuitRestakingPool.address,
      value: 0n,
      data: encodeFunctionData({
        abi: zircuitRestakingPool.abi,
        functionName: "depositFor",
        args: [usdeAddr, context.account.address, usdeAmount],
      }),
      abi: zircuitRestakingPool.abi as Abi,
      meta: {
        highlights: ["Zircuit"],
      },
    });

    return txs;
  },
  previewTx: [
    {
      name: "Approve",
      description: "USDC for Curve",
      to: usdcAddr,
      meta: {
        highlights: ["Curve"],
      },
    },
    {
      name: "Swap",
      description: "USDC to USDe",
      to: curveStableSwapAddr,
    },
    {
      name: "Approve",
      description: "USDe for Zircuit",
      to: usdeAddr,
      meta: {
        highlights: ["Zircuit"],
      },
    },
    {
      name: `Stake`,
      description: `USDe to Zircuit`,
      to: zircuitRestakingPoolAddr,
      meta: {
        highlights: ["Zircuit"],
      },
    },
  ],
  setActions: () => {
    return [
      {
        href: "https://app.ethena.fi/join",
        text: "Check Sats (Ethena)",
      },
      {
        href: "https://stake.zircuit.com/?ref=BENTOZ",
        text: "Check Points (Zircuit)",
      },
    ];
  },
};

export default [usdcCase];
