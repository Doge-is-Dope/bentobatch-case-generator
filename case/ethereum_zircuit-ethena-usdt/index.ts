import type { Abi } from "abitype";
import { Context, BatchCase, InputType, Tag, Tx, TagTitle, WalletType } from "@/models/cases/v3/types";
import { balance, decimalValidator, max } from "@/models/cases/v3/utils";
import { createPublicClient, getContract, http, encodeFunctionData, parseUnits, formatUnits } from "viem";
import USDT from "./abi/USDT.json";
import USDe from "./abi/USDe.json";
import UniswapRouterV3 from "./abi/UniswapRouterV3.json";
import UniswapQuoterV3 from "./abi/UniswapQuoterV3.json";
import ZircuitRestakingPool from "./abi/ZircuitRestakingPool.json";
import BATCH_DETAILS, { ATTRIBUTES, CASE_PROTOCOLS } from "./usdt.details";

const usdtAddr = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const usdeAddr = "0x4c9edd5852cd905f086c759e8383e09bff1e68b3";
const uniswapQuoterAddr = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const uniswapRouterAddr = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const zircuitRestakingPoolAddr = "0xF047ab4c75cebf0eB9ed34Ae2c186f3611aEAfa6";

const tags = [
  { title: TagTitle.Official },
  { title: TagTitle.Benefits },
  { title: TagTitle.Defi },
  { title: TagTitle.Restaking },
];

const usdtCase: BatchCase = {
  id: "zircuit_ethena_usdt",
  name: "🔥 Earn extra 15% Zircuit Points with Ethena Restaking by USDT",
  description: "Swap USDT to USDe and deposit USDe on Zircuit in One Click.",
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
      name: "USDT Amount",
      inputType: InputType.ERC20Amount,
      description: "Amount to buy USDe",
      validate: decimalValidator(6, BigInt(0)),
      options: {
        token: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
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

    const usdt = getContract({
      address: usdtAddr,
      abi: USDT,
      client: client,
    });

    const usde = getContract({
      address: usdeAddr,
      abi: USDe,
      client: client,
    });

    const uniswapQuoter = getContract({
      address: uniswapQuoterAddr,
      abi: UniswapQuoterV3,
      client: client,
    });

    const uniswapRouter = getContract({
      address: uniswapRouterAddr,
      abi: UniswapRouterV3,
      client: client,
    });

    const zircuitRestakingPool = getContract({
      address: zircuitRestakingPoolAddr,
      abi: ZircuitRestakingPool,
      client: client,
    });

    const usdtAllowance = (await usdt.read.allowance([context.account.address, uniswapRouter.address])) as bigint;

    const usdtAmount = parseUnits(inputs[0], 6);

    if (usdtAmount > usdtAllowance) {
      txs.push({
        name: `Approve`,
        description: `Approve ${inputs[0]} USDT to Uniswap`,
        to: usdt.address,
        value: 0n,
        data: encodeFunctionData({
          abi: usdt.abi,
          functionName: "approve",
          args: [uniswapRouter.address, usdtAmount],
        }),
        abi: usdt.abi as Abi,
        meta: {
          highlights: ["Uniswap"],
        },
      });
    }

    const usdeAmount = (await uniswapQuoter.read.quoteExactInputSingle([
      usdtAddr, // token in
      usdeAddr, // token out
      "100", // fee
      usdtAmount, // amount in
      "0", // sqrtPriceLimitX96
    ])) as bigint;

    const usdeFormatAmount = formatUnits(usdeAmount, 18);

    txs.push({
      name: `Swap`,
      description: `${inputs[0]} USDT to ${usdeFormatAmount} USDe`,
      to: uniswapRouter.address,
      value: 0n,
      data: encodeFunctionData({
        abi: uniswapRouter.abi,
        functionName: "exactInputSingle",
        args: [
          [
            usdtAddr, // token in
            usdeAddr, // token out
            "100", // fee
            context.account.address, // recipient
            Math.floor(Date.now() / 1000) + 300, // deadline
            usdtAmount, // amountIn
            usdeAmount, // amountOutMinimum
            "0", // sqrtPriceLimitX96
          ],
        ],
      }),
      abi: uniswapRouter.abi as Abi,
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
      description: "USDT for Uniswap",
      to: usdtAddr,
      meta: {
        highlights: ["Uniswap"],
      },
    },
    {
      name: "Swap",
      description: "USDT to USDe",
      to: uniswapRouterAddr,
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

export default [usdtCase];
