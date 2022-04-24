import { stable1 } from "../constants/constants.js";

interface NanoSwapQuote {
  ({}: {
    stable1Supply: bigint;
    stable2Supply: bigint;
    swapInAssetId: number;
    swapInAmount: number;
    amplificationFactor: number;
  }): Promise<{
    asset1Delta: number;
    asset2Delta: number;
    extraComputeFee: number;
  }>;
}

export const getNanoSwapExactForQuote: NanoSwapQuote = async ({
  stable1Supply,
  stable2Supply,
  swapInAssetId,
  swapInAmount,
  amplificationFactor,
}) => {
  let swapInAmountLessFees = swapInAmount - (Math.floor(swapInAmount * 0.001) + 1);
  let swapOutAmount = 0;
  let numIter = 0;

  let asset1Delta:number, asset2Delta:number, extraComputeFee:number;
  if (swapInAssetId === stable1) {
    let [D, numIterD] = getD([stable1Supply, stable2Supply], amplificationFactor)!;
    let [y, numIterY] = getY(
      0,
      1,
      stable1Supply + BigInt(swapInAmountLessFees),
      [stable1Supply, stable2Supply],
      D,
      amplificationFactor
    )!;
    swapOutAmount = Number(BigInt(stable2Supply) - BigInt(y) - 1n);
    numIter = numIterD + numIterY;

    asset1Delta = -1 * swapInAmount;
    asset2Delta = swapOutAmount;
    extraComputeFee = Math.ceil(numIter / (700 / 400));
  } else {
    let [D, numIterD] = getD([stable1Supply, stable2Supply], amplificationFactor)!;
    let [y, numIterY] = getY(
      1,
      0,
      stable2Supply + BigInt(swapInAmountLessFees),
      [stable1Supply, stable2Supply],
      D,
      amplificationFactor
    )!;
    swapOutAmount = Number(BigInt(stable1Supply) - BigInt(y) - 1n);
    numIter = numIterD + numIterY;
    asset1Delta = swapOutAmount;
    asset2Delta = -1 * swapInAmount;
    extraComputeFee = Math.ceil(numIter / (700 / 400));
  }
  return { asset1Delta, asset2Delta, extraComputeFee };
};

interface NanoMintQuote {
  ({}: {
    assetId: number;
    assetAmount: number;
    whatIfDelta1?: bigint;
    whatIfDelta2?: bigint;
    stable1Supply: bigint;
    stable2Supply: bigint;
    amplificationFactor: number;
    nanoLTIssued: bigint;
  }): Promise<{
    asset1Delta: number;
    asset2Delta: number;
    lpDelta: number;
    extraComputeFee: number;
    priceDelta: number;
  }>;
}

export const getNanoMintQuote: NanoMintQuote = async ({
  assetId,
  assetAmount,
  whatIfDelta1 = 0n,
  whatIfDelta2 = 0n,
  stable1Supply,
  stable2Supply,
  amplificationFactor,
  nanoLTIssued,
}) => {
  if (nanoLTIssued == 0n) {
    throw new Error("Error: pool is empty");
  }

  let asset1PooledAmount = 0n;
  let asset2PooledAmount = 0n;
  let lpsIssued = 0;
  let numIter = 0;

  if (assetId === stable1) {
    asset1PooledAmount = BigInt(assetAmount);
    asset2PooledAmount = (asset1PooledAmount * (stable2Supply + whatIfDelta2)) / (stable1Supply + whatIfDelta1);
  } else {
    asset2PooledAmount = BigInt(assetAmount);
    asset1PooledAmount = (asset2PooledAmount * (stable1Supply + whatIfDelta1)) / (stable2Supply + whatIfDelta2) + 1n;
  }

  let [D0, numIterD0] = getD([stable1Supply, stable2Supply], amplificationFactor)!;
  let [D1, numIterD1] = getD(
    [asset1PooledAmount + stable1Supply, asset2PooledAmount + stable2Supply],
    amplificationFactor
  )!;
  lpsIssued = Math.floor(Number(nanoLTIssued) * Number((D1 - D0) / D0));
  numIter = numIterD0 + numIterD1;
  const extraComputeFee = Math.ceil(numIter / (700 / 400));
  const asset1Delta = -1 * Number(asset1PooledAmount);
  const asset2Delta = -1 * Number(asset2PooledAmount);
  let priceDelta;
  if (lpsIssued === 0) {
    priceDelta = 0;
  } else {
    let startingPriceRatio = Number(stable1Supply) / Number(stable2Supply);
    let finalPriceRatio = (Number(stable1Supply) + asset1Delta) / (Number(stable2Supply) + asset2Delta);
    priceDelta = Math.abs(startingPriceRatio / finalPriceRatio - 1);
  }
  return { asset1Delta, asset2Delta, lpDelta: lpsIssued, extraComputeFee, priceDelta };
};

const A_PRECISION = 1000000n;

function getD(tokenAmounts: Array<bigint>, amplificationFactor: number): number[] | undefined {
  let N_COINS = tokenAmounts.length;
  let S = 0n;
  let Dprev = 0n;

  for (var _x of Array.from(tokenAmounts)) {
    S += BigInt(_x);
  }
  if (S == 0n) {
    return [0, 0];
  }

  let D = S;

  let Ann = BigInt(amplificationFactor * Math.pow(N_COINS, N_COINS));

  for (var _i = 0; _i < 255; _i++) {
    var D_P = D;
    for (var _x of Array.from(tokenAmounts)) {
      D_P = (D_P * D) / (BigInt(_x) * BigInt(N_COINS));
    }
    Dprev = D;
    D =
      (((Ann * S) / A_PRECISION + D_P * BigInt(N_COINS)) * D) /
      (((Ann - A_PRECISION) * D) / A_PRECISION + BigInt(N_COINS + 1) * D_P);
    if (D > Dprev) {
      if (D - Dprev <= 1n) {
        return [Number(D), _i];
      }
    } else {
      if (Dprev - D <= 1n) {
        return [Number(D), _i];
      }
    }
  }
}

function getY(
  i: number,
  j: number,
  x: bigint,
  tokenAmounts: bigint[],
  D: number,
  amplificationFactor: number
): number[] | undefined {
  let N_COINS = tokenAmounts.length;
  let Ann = BigInt(amplificationFactor * Math.pow(N_COINS, N_COINS));
  let c = BigInt(D);
  let S = 0n;
  let _x = 0n;
  let y_prev = 0n;

  for (var _i = 0; _i < N_COINS; _i++) {
    if (_i == i) {
      _x = BigInt(x);
    } else if (_i != j) {
      _x = BigInt(tokenAmounts[_i]);
    } else {
      continue;
    }
    S += _x;
    c = (c * BigInt(D)) / (BigInt(_x) * BigInt(N_COINS));
  }
  c = (c * BigInt(D) * A_PRECISION) / (Ann * BigInt(N_COINS));
  let b = S + (BigInt(D) * A_PRECISION) / Ann;
  let y = BigInt(D);
  for (var _i = 0; _i < 255; _i++) {
    y_prev = y;
    y = (y * y + c) / (BigInt(2) * y + b - BigInt(D));
    if (y > y_prev) {
      if (y - y_prev <= BigInt(1)) {
        return [Number(y), _i];
      }
    } else {
      if (y_prev - y <= BigInt(1)) {
        return [Number(y), _i];
      }
    }
  }
}

type GetAmpFactor = {
  t: bigint;
  initialAmplificationFactor: bigint;
  futureAmplificationFactor?: bigint;
  initialAmplificationFactorTime?: bigint;
  futureAmplificationFactorTime?: bigint;
};

export function getAmplificationFactor({
  t,
  initialAmplificationFactor,
  futureAmplificationFactor,
  initialAmplificationFactorTime,
  futureAmplificationFactorTime,
}: GetAmpFactor): number {
  if (
    futureAmplificationFactor &&
    initialAmplificationFactorTime &&
    futureAmplificationFactorTime &&
    t < futureAmplificationFactorTime
  ) {
    return Number(
      initialAmplificationFactor +
        ((futureAmplificationFactor - initialAmplificationFactor) * (t - initialAmplificationFactor)) /
          (futureAmplificationFactorTime - initialAmplificationFactorTime)
    );
  }
  return Number(futureAmplificationFactor);
}

interface cristalBall {
  ({}: {
    stable1Supply: bigint;
    stable2Supply: bigint;
    stableIn: number;
    amountIn: number;
    amplificationFactor: number;
  }): Promise<{
    toConvert: number;
    toGet: number;
    extraFeeSwap: number;
  }>;
}

export const cristalBall: cristalBall = async ({
  stable1Supply,
  stable2Supply,
  stableIn,
  amountIn,
  amplificationFactor,
}) => {
  let toConvert = Math.floor(amountIn / 2);
  let targetRatio = Number(stable1Supply) / Number(stable2Supply);
  let toGet = 0,
    extraFeeSwap = 0,
    loopBreaker = 0,
    deltaError = 2,
    tokenRatio = 1;

  while (deltaError > 1.01 || deltaError < 0.99) {
    // in some edge cases with too small a zap amount, deltaError will never fall below 1%
    // in that case metazap will fail during the mint operation in the nanopool
    loopBreaker += 1;
    if (loopBreaker > 15) throw new Error("Metazap not possible, increase metazap amount");
    const { asset2Delta, asset1Delta, extraComputeFee } = await getNanoSwapExactForQuote({
      stable1Supply,
      stable2Supply,
      swapInAssetId: stableIn,
      swapInAmount: toConvert,
      amplificationFactor,
    });
    extraFeeSwap = extraComputeFee;
    if (stableIn === stable1) {
      toGet = asset2Delta;
      targetRatio = (Number(stable1Supply) + toConvert) / (Number(stable2Supply) - toGet);
      tokenRatio = (amountIn - toConvert) / toGet;
      deltaError = tokenRatio / targetRatio;
      toConvert = Math.floor(toConvert * Math.sqrt(deltaError));
    } else {
      toGet = asset1Delta;
      targetRatio = (Number(stable1Supply) - toGet) / (Number(stable2Supply) + toConvert);
      tokenRatio = toGet / (amountIn - toConvert);
      deltaError = tokenRatio / targetRatio;
      toConvert = Math.floor(toConvert / Math.sqrt(deltaError));
    }
    console.log("deltaError:", deltaError);
  }
  console.log("toConvert: ", toConvert, "toGet: ", toGet);
  return { toConvert, toGet, extraFeeSwap };
};
