import { ComputationsInput, ComputationsOutput } from "./uniswapComputations";
import { nearestUsableTick } from "./nearestUsableTick";

const q96: number = 2 ** 96;

const priceToTick = (p: number): number => {
  return Math.floor(Math.log(p) / Math.log(1.0001));
};

const priceToSqrtP = (p: number): number => {
  return Math.sqrt(p) * Number(q96);
};

const tickToPrice = (t: number): number => {
  return Math.exp(t * Math.log(1.0001));
};

const liquidity0 = (amount: number, pa: number, pb: number): number => {
  if (pa > pb) {
    [pa, pb] = [pb, pa];
  }
  return (amount * pa * pb) / q96 / (pb - pa);
};

const liquidity1 = (amount: number, pa: number, pb: number): number => {
  if (pa > pb) {
    [pa, pb] = [pb, pa];
  }
  return (amount * q96) / (pb - pa);
};

const calcAmount0 = (liq: number, pa: number, pb: number): number => {
  if (pa > pb) {
    [pa, pb] = [pb, pa];
  }
  return (liq * q96 * (pb - pa)) / pa / pb;
};

const calcAmount1 = (liq: number, pa: number, pb: number): number => {
  if (pa > pb) {
    [pa, pb] = [pb, pa];
  }
  return (liq * (pb - pa)) / q96;
};

export function calculateUniswapParams(input: ComputationsInput): ComputationsOutput {
  const { tickSpacing, sqrtPriceX96, inputAmount } = input;
  // For initial liquidity calculation
  const inputAmountNumber = Number(inputAmount);

  // Current price and tick
  const price = (Number(sqrtPriceX96) / Number(q96)) ** 2;
  const tick = priceToTick(price);

  // upper and lower price
  const tickLow = nearestUsableTick(tick - tickSpacing, tickSpacing);
  const tickUpp = nearestUsableTick(tick + tickSpacing, tickSpacing);

  const priceLow = tickToPrice(tickLow);
  const priceUpp = tickToPrice(tickUpp);

  // upper and lower sqrtPrice
  const sqrtPLow = priceToSqrtP(priceLow);
  const sqrtPCur = priceToSqrtP(price);
  const sqrtPUpp = priceToSqrtP(priceUpp);

  // liquidity
  const liq0 = liquidity0(inputAmountNumber, sqrtPCur, sqrtPUpp);
  const liq1 = liquidity1(inputAmountNumber, sqrtPCur, sqrtPLow);
  const liq = Math.min(liq0, liq1);

  // amount0 and amount1
  const amount0 = calcAmount0(liq, sqrtPUpp, sqrtPCur);
  const amount1 = calcAmount1(liq, sqrtPLow, sqrtPCur);

  return {
    tickLower: tickLow,
    tickUpper: tickUpp,
    amount0,
    amount1,
  };
}
