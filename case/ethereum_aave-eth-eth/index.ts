import type { Abi } from "abitype";
import { Context, BatchCase, InputType, Tag, Tx, ActionsArgs, TagTitle, WalletType } from "@/models/cases/v3/types";
import { balance, decimalValidator, max } from "@/models/cases/v3/utils";
import { createPublicClient, encodeFunctionData, formatUnits, getContract, http, parseUnits } from "viem";
import AAVE_POOL_V3 from "./abi/AAVE_POOL_V3.json";
import AAVE_WRAPPED_TOKEN_GATEWAY_V3 from "./abi/AAVE_WRAPPED_TOKEN_GATEWAY_V3.json";
import DEBT_WETH from "./abi/DEBT_WETH.json";
import PRICE_FEED from "./abi/PRICE_FEED.json";
import BATCH_DETAILS, { CASE_PROTOCOLS, ATTRIBUTES } from "./eth.eth.details";

const aavePoolV3Addr = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
const aaveWrappedTokenGatewayV3Addr = "0x893411580e590D62dDBca8a703d61Cc4A8c7b2b9";
const debtWethAddr = "0xeA51d7853EEFb32b6ee06b1C12E6dcCA88Be0fFE";

const ethCase: BatchCase = {
  id: "aave_eth_eth",
  name: "Deposit ETH and borrow ETH on AAVE [Normal-Mode]",
  description: "One click to deposit ETH and borrow 70% equivalent value in ETH.",
  details: BATCH_DETAILS,
  website: {
    title: "AAVE",
    url: "https://aave.com/",
  },
  tags: [TagTitle.Defi, TagTitle.Lending].map((name) => ({ title: name } as Tag)),
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
      name: "ETH Amount",
      inputType: InputType.NativeAmount,
      description: "Supply to AAVE as collateral",
      validate: decimalValidator(18, BigInt(0)),
      actionContent: balance,
      actionButtons: [max],
    },
    {
      name: "Borrow Percentage",
      inputType: InputType.Text,
      description: "Percentage of the supplied ETH to be borrowed as ETH (Max: 70%)",
      validate: decimalValidator(0, BigInt(0), BigInt(70)),
    },
  ],
  previewTx: [
    {
      name: "Supply",
      description: `ETH to AAVE as collateral`,
      to: aaveWrappedTokenGatewayV3Addr,
      meta: {
        highlights: ["AAVE"],
      },
    },
    {
      name: "Disable",
      description: `AAVE E-Mode if it is enabled`,
      to: aavePoolV3Addr,
      meta: {
        highlights: ["AAVE"],
      },
    },
    {
      name: "Delegate",
      description: `borrowing power on the debt WETH if needed`,
      to: debtWethAddr,
      meta: {
        highlights: ["AAVE"],
      },
    },
    {
      name: "Borrow",
      description: `ETH from AAVE`,
      to: aaveWrappedTokenGatewayV3Addr,
      meta: {
        highlights: ["AAVE"],
      },
    },
  ],
  setActions: (_: ActionsArgs) => {
    return [
      {
        href: "https://app.aave.com/",
        text: "Manage Position (AAVE)",
      },
    ];
  },
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

    const aavePoolV3 = getContract({
      address: aavePoolV3Addr,
      abi: AAVE_POOL_V3,
      client: client,
    });

    const aaveWrappedTokenGatewayV3 = getContract({
      address: aaveWrappedTokenGatewayV3Addr,
      abi: AAVE_WRAPPED_TOKEN_GATEWAY_V3,
      client: client,
    });

    const debtWeth = getContract({
      address: debtWethAddr,
      abi: DEBT_WETH,
      client: client,
    });

    const ethAmount = parseUnits(inputs[0], 18);

    txs.push({
      name: `Supply`,
      description: `${inputs[0]} ETH to AAVE as collateral`,
      to: aaveWrappedTokenGatewayV3.address,
      value: ethAmount,
      data: encodeFunctionData({
        abi: aaveWrappedTokenGatewayV3.abi,
        functionName: "depositETH",
        args: [
          aavePoolV3Addr, // pool
          context.account.address, // onBehalfOf
          0, // referralCode, is currently inactive
        ],
      }),
      abi: aaveWrappedTokenGatewayV3.abi as Abi,
      meta: {
        highlights: ["AAVE"],
      },
    });

    const isInEMode = (await aavePoolV3.read.getUserEMode([context.account.address])) == 1n;

    if (isInEMode) {
      txs.push({
        name: `Disable`,
        description: `AAVE E-Mode`,
        to: aavePoolV3.address,
        value: 0n,
        data: encodeFunctionData({
          abi: aavePoolV3.abi,
          functionName: "setUserEMode",
          args: [
            0, // categoryId
          ],
        }),
        abi: aavePoolV3.abi as Abi,
        meta: {
          highlights: ["AAVE"],
        },
      });
    }

    const ethPriceFeedAddr = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";

    const ethPriceFeed = getContract({
      address: ethPriceFeedAddr,
      abi: PRICE_FEED,
      client: client,
    });

    const ethPrice = (await ethPriceFeed.read.latestAnswer()) as bigint;
    const collateralValue = (ethPrice * ethAmount) / 1000000000000000000n;
    const percentage = Number(inputs[1]) / 100;
    const borrowAmount = (Number(collateralValue) * percentage) / Number(ethPrice);
    const borrowEthAmount = parseUnits(borrowAmount.toString(), 18);

    const borrowAllowance = (await debtWeth.read.borrowAllowance([
      context.account.address,
      aaveWrappedTokenGatewayV3Addr,
    ])) as bigint;

    if (borrowEthAmount > borrowAllowance) {
      txs.push({
        name: `Delegate`,
        description: `borrowing power on the debt WETH`,
        to: debtWeth.address,
        value: 0n,
        data: encodeFunctionData({
          abi: debtWeth.abi,
          functionName: "approveDelegation",
          args: [
            aaveWrappedTokenGatewayV3Addr, // delegatee
            borrowEthAmount, // amount
          ],
        }),
        abi: debtWeth.abi as Abi,
      });
    }

    txs.push({
      name: `Borrow`,
      description: `${formatUnits(borrowEthAmount, 18)} ETH from AAVE`,
      to: aaveWrappedTokenGatewayV3.address,
      value: 0n,
      data: encodeFunctionData({
        abi: aaveWrappedTokenGatewayV3.abi,
        functionName: "borrowETH",
        args: [
          aavePoolV3Addr, // delegatee
          borrowEthAmount, // amount
          2, // interestRateMode
          0, // referralCode, is currently inactive
        ],
      }),
      abi: aaveWrappedTokenGatewayV3.abi as Abi,
      meta: {
        highlights: ["AAVE"],
      },
    });

    return txs;
  },
};

export default [ethCase];
