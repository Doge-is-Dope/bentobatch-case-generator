//// [V1] Get Swap Route
type ExtraFee = {
    feeAmount: string;
    chargeFeeBy: string;
    isInBps: boolean;
    feeReceiver: string;
};

type RouteStep = {
    pool: string;
    tokenIn: string;
    tokenOut: string;
    limitReturnAmount: string;
    swapAmount: string;
    amountOut: string;
    exchange: string;
    poolType: string;
    poolExtra: string;
    extra: string;
};

export type RouteSummary = {
    tokenIn: string;
    amountIn: string;
    amountInUsd: string;
    tokenInMarketPriceAvailable: boolean;
    tokenOut: string;
    amountOut: string;
    amountOutUsd: string;
    tokenOutMarketPriceAvailable: boolean;
    gas: string;
    gasPrice: string;
    gasUsd: string;
    extraFee: ExtraFee;
    route: RouteStep[][];
};

type KyberSwapResponse = {
    code: string;
    message: string;
    data: {
        routeSummary: RouteSummary;
        routerAddress: string;
    };
};

async function fetchRouteSummary(tokenIn: `0x${string}`, tokenOut: `0x${string}`, amount: BigInt): Promise<RouteSummary> {
    const queryParams = new URLSearchParams({
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        amountIn: amount.toString(),
    });

    const url = `https://aggregator-api.kyberswap.com/scroll/api/v1/routes?${queryParams}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {},
    });
    
    const responseData: KyberSwapResponse = await response.json();
    
    if (!responseData || !responseData.data || !responseData.data.routeSummary) {
        throw new Error('Invalid response data');
    }
    
    return responseData.data.routeSummary;
}

//// [V1] Post Swap Route For Encoded Data
type OutputChange = {
    amount: string;
    percent: number;
    level: number;
};

export type RouteData = {
    amountIn: string;
    amountInUsd: string;
    amountOut: string;
    amountOutUsd: string;
    gas: string;
    gasUsd: string;
    outputChange: OutputChange;
    data: string;  // This might be renamed to avoid confusion, such as "additionalData"
    routerAddress: string;
};

type KyberSwapBuildResponse = {
    code: string;
    message: string;
    data: RouteData;
};

async function postBuildRoute(routeSummary: RouteSummary, sender: `0x${string}`, recipient: `0x${string}`): Promise<RouteData> {
    const url = `https://aggregator-api.kyberswap.com/scroll/api/v1/route/build`;
    const requestBody = {
        "routeSummary": routeSummary,
        "deadline": Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
        "slippageTolerance": 150, // means 1.5%
        "sender": sender,
        "recipient": recipient
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    });

    const responseData: KyberSwapBuildResponse = await response.json();

    // Check for possible errors in the response or the presence of the data
    if (!responseData || responseData.code != "0" || !responseData.data) {
        throw new Error(responseData.message || 'Unknown error from KyberSwap API');
    }

    // Return the 'data' portion of the response
    return responseData.data;
}

export {
    fetchRouteSummary, postBuildRoute
};

