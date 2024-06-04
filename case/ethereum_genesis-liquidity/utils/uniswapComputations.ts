export interface ComputationsInput {
  tickSpacing: number;
  sqrtPriceX96: bigint;
  inputAmount: bigint;
}

export interface ComputationsOutput {
  tickLower: number;
  tickUpper: number;
  amount0: number; // actual amount of wstETH when 1 eth is supplied
  amount1: number; // actual amount of genETH when 1 eth is supplied
}
