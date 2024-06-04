import { BatchCase, Context, Tx, InputType, TagTitle, WalletType } from "@/cases/types";
import { decimalValidator, getDecimals } from "@/models/cases/v3/utils";
import { parseEther, getContract, createPublicClient, http, formatUnits, encodeFunctionData, erc20Abi } from "viem";
// import BATCH_DETAILS from './usde.details'
import { addLiquiditySingleTokenData, getMarketAddr } from "../prebuilt-tx/pendle";
import { arbitrum } from "viem/chains";
import { swapPreviewTx, swapTx } from "../prebuilt-tx/1inch";
import { AddressNotFoundError } from "../error";

const usdeTokenAddr = "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34";
const usdeSYTokenAddr = "0xb3c24d9dccc2ec5f778742389ffe448e295b84e0";

const swapPreview = swapPreviewTx({
  chainId: arbitrum.id,
  srcTokenSymbol: "ETH",
  dstTokenSymbol: "USDe",
});

const tags = [{ title: TagTitle.Defi }, { title: TagTitle.Restaking }];

const pendleUsde: BatchCase = {
  id: "pendle_usde",
  name: "Earn up to 30% LP APY and Ethena sats on Pendle",
  description: "One Click to swap ETH to USDe and provide LP on Pendle to earn high APY and Ethena sats.",
  // details: BATCH_DETAILS,
  website: {
    title: "Pendle",
    url: "https://app.pendle.finance/points",
  },
  tags,
  curatorTwitter: {
    name: "Bento Batch 🍱",
    url: "https://x.com/bentobatch",
  },
  networkId: arbitrum.id,
  atomic: true,
  renderExpiry: 15,
  supportedWalletTypes: [WalletType.AA, WalletType.EOA],
  inputs: [
    {
      name: "ETH Amount",
      inputType: InputType.NativeAmount,
      description: "Amount to purchase USDe and buy LP on Pendle",
      validate: decimalValidator(18, BigInt(0)),
    },
  ],
  render: async (context: Context) => {
    const userAddress = context.account.address;
    if (!userAddress) throw new AddressNotFoundError();

    const inputAmount = parseEther(context.inputs[0] as string);

    const txs: Tx[] = [];

    const usdeDecimals = await getDecimals(usdeTokenAddr, context.chain);

    const oneInchTxInfo = await swapTx({
      chainId: context.chain.id,
      userAddress: userAddress,
      srcTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      srcTokenSymbol: "ETH",
      srcTokenDecimals: 18,
      srcAmount: inputAmount,
      dstTokenAddress: usdeTokenAddr,
      dstTokenSymbol: "USDe",
      dstTokenDecimals: usdeDecimals,
    });

    txs.push(oneInchTxInfo.tx);
    const estimateUsdeAmount = oneInchTxInfo.dstAmount;

    const pendleUsdeMarketAddr = await getMarketAddr({
      chainId: context.chain.id.toString(),
      syTokenAddr: usdeSYTokenAddr,
    });

    const pendleTxInfo = await addLiquiditySingleTokenData(
      {
        chain: context.chain,
        receiverAddr: userAddress,
        marketAddr: pendleUsdeMarketAddr,
        tokenInAddr: usdeTokenAddr,
        amountTokenIn: estimateUsdeAmount,
        slippage: 0.002,
      },
      { tokenInName: "USDe" }
    );

    const client = createPublicClient({
      chain: context.chain,
      transport: http(),
    });

    const usdeContract = getContract({
      address: usdeTokenAddr,
      abi: erc20Abi,
      client,
    });

    const usdeAllowance = (await usdeContract.read.allowance([userAddress, pendleTxInfo.routerAddress])) as bigint;

    if (estimateUsdeAmount > usdeAllowance) {
      txs.push({
        name: `Approve`,
        description: `${formatUnits(estimateUsdeAmount, usdeDecimals)} USDe to Pendle`,
        to: usdeTokenAddr,
        value: 0n,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [pendleTxInfo.routerAddress, estimateUsdeAmount],
        }),
        abi: erc20Abi,
        meta: {
          highlights: ["Pendle"],
        },
      });
    }

    txs.push(pendleTxInfo.tx);

    return txs;
  },
  previewTx: [
    swapPreview,
    {
      name: `Approve`,
      description: `USDe to Pendle`,
      to: usdeTokenAddr,
      meta: {
        highlights: ["Pendle"],
      },
    },
    {
      name: "Provide",
      description: "Liquidity to PT/SY pool on Pendle",
      to: "0x888888888889758F76e7103c6CbF23ABbF58F946", // It might change, so hardcode it for now.
      meta: {
        highlights: ["Pendle"],
      },
    },
  ],
  setActions: () => {
    return [
      {
        href: "https://app.ethena.fi/join",
        text: "Sats Campaign (Ethena)",
      },
      {
        href: "https://app.pendle.finance/trade/dashboard/overview?timeframe=allTime",
        text: "Manage Position (Pendle)",
      },
    ];
  },
};

export default [pendleUsde];
