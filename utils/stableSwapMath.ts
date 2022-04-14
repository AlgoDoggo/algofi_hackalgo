import axios from "axios";
import { stable1, stable1_stable2_app } from "../constants/constants.js";

const baseUrl = "https://testnet-idx.algonode.cloud"; // algonode.io

interface NanoSwapQuote {
  ({}: { stable1Supply: number; stable2Supply: number; swapInAssetId: number; swapInAmount: number }): Promise<{
    asset1Delta: number;
    asset2Delta: number;
    lpDelta: number;
    extraComputeFee: number;
    priceDelta: number;
  }>;
}

export const getNanoSwapExactForQuote: NanoSwapQuote = async ({
  stable1Supply,
  stable2Supply,
  swapInAssetId,
  swapInAmount,
}) => {
  let swapInAmountLessFees = swapInAmount - (Math.floor(swapInAmount * 0.001) + 1);
  let swapOutAmount = 0;
  let numIter = 0;

  const { data: nanopoolData } = await axios
    .get(`${baseUrl}/v2/applications/${stable1_stable2_app}`)
    .catch(function (error) {
      throw new Error(
        error?.response?.data ? `error: ${error.response.status}  ${JSON.stringify(error.response.data)}` : error?.message
      );
    });
  const nanoState = nanopoolData?.application?.params?.["global-state"];
  const initialAmplificationFactor = nanoState.find((g) => g.key === "aWFm")?.value?.uint;
  const futureAmplificationFactor = nanoState.find((g) => g.key === "ZmFm")?.value?.uint;
  const initialAmplificationFactorTime = nanoState.find((g) => g.key === "aWF0")?.value?.uint;
  const futureAmplificationFactorTime = nanoState.find((g) => g.key === "ZmF0")?.value?.uint;

  const amplificationFactor = getAmplificationFactor({
    t: Math.floor(Date.now() / 1000),
    initialAmplificationFactor,
    futureAmplificationFactor,
    initialAmplificationFactorTime,
    futureAmplificationFactorTime,
  });

  let asset1Delta, asset2Delta, lpDelta, extraComputeFee;
  if (swapInAssetId === stable1) {
    let [D, numIterD] = getD([stable1Supply, stable2Supply], amplificationFactor)!;
    let [y, numIterY] = getY(
      0,
      1,
      stable1Supply + swapInAmountLessFees,
      [stable1Supply, stable2Supply],
      D,
      amplificationFactor
    )!;
    swapOutAmount = stable2Supply - Number(y) - 1;
    numIter = numIterD + numIterY;

    asset1Delta = -1 * swapInAmount;
    asset2Delta = swapOutAmount;
    lpDelta = 0;
    extraComputeFee = Math.ceil(numIter / (700 / 400));
  } else {
    let [D, numIterD] = getD([stable1Supply, stable2Supply], amplificationFactor)!;
    let [y, numIterY] = getY(
      1,
      0,
      stable2Supply + swapInAmountLessFees,
      [stable1Supply, stable2Supply],
      D,
      amplificationFactor
    )!;
    swapOutAmount = stable1Supply - y - 1;
    numIter = numIterD + numIterY;

    asset1Delta = swapOutAmount;
    asset2Delta = -1 * swapInAmount;
    lpDelta = 0;
    extraComputeFee = Math.ceil(numIter / (700 / 400));
  }
  return { asset1Delta, asset2Delta, lpDelta, extraComputeFee, priceDelta: 0 };
};

interface NanoMintQuote {
  ({}: {
    assetId: number;
    assetAmount: number;
    whatIfDelta1?: number;
    whatIfDelta2?: number;
    stable1Supply: number;
    stable2Supply: number;
  }): Promise<{ asset1Delta: number; asset2Delta: number; lpDelta: number; extraComputeFee: number; priceDelta: number }>;
}

export const getNanoMintQuote: NanoMintQuote = async ({
  assetId,
  assetAmount,
  whatIfDelta1 = 0,
  whatIfDelta2 = 0,
  stable1Supply,
  stable2Supply,
}) => {
  const { data: nanopoolData } = await axios
    .get(`${baseUrl}/v2/applications/${stable1_stable2_app}`)
    .catch(function (error) {
      throw new Error(
        error?.response?.data ? `error: ${error.response.status}  ${JSON.stringify(error.response.data)}` : error?.message
      );
    });
  const nanoState = nanopoolData?.application?.params?.["global-state"];
  const lpCirculation = nanoState.find((g) => g.key === "bGM=")?.value?.uint;
  const initialAmplificationFactor = nanoState.find((g) => g.key === "aWFm")?.value?.uint;
  const futureAmplificationFactor = nanoState.find((g) => g.key === "ZmFm")?.value?.uint;
  const initialAmplificationFactorTime = nanoState.find((g) => g.key === "aWF0")?.value?.uint;
  const futureAmplificationFactorTime = nanoState.find((g) => g.key === "ZmF0")?.value?.uint;
  const amplificationFactor = getAmplificationFactor({
    t: Math.floor(Date.now() / 1000),
    initialAmplificationFactor,
    futureAmplificationFactor,
    initialAmplificationFactorTime,
    futureAmplificationFactorTime,
  });

  if (lpCirculation === 0) {
    throw new Error("Error: pool is empty");
  }

  let asset1PooledAmount = 0;
  let asset2PooledAmount = 0;
  let lpsIssued = 0;
  let numIter = 0;

  if (assetId === stable1) {
    asset1PooledAmount = assetAmount;
    asset2PooledAmount = Math.floor((asset1PooledAmount * (stable2Supply + whatIfDelta2)) / (stable1Supply + whatIfDelta1));
  } else {
    asset2PooledAmount = assetAmount;
    asset1PooledAmount = Math.ceil((asset2PooledAmount * (stable1Supply + whatIfDelta1)) / (stable2Supply + whatIfDelta2));
  }

  let [D0, numIterD0] = getD([stable1Supply, stable2Supply], amplificationFactor)!;
  let [D1, numIterD1] = getD([asset1PooledAmount + stable1Supply, asset2PooledAmount + stable2Supply], amplificationFactor)!;
  lpsIssued = Math.floor(lpCirculation * Number((D1 - D0) / D0));
  numIter = numIterD0 + numIterD1;
  const extraComputeFee = Math.ceil(numIter / (700 / 400));
  const asset1Delta = -1 * asset1PooledAmount;
  const asset2Delta = -1 * asset2PooledAmount;
  let priceDelta;
  if (lpsIssued === 0) {
    priceDelta = 0;
  } else {
    let startingPriceRatio = stable1Supply / stable2Supply;
    let finalPriceRatio = (stable1Supply + asset1Delta) / (stable2Supply + asset2Delta);
    priceDelta = Math.abs(startingPriceRatio / finalPriceRatio - 1);
  }
  return { asset1Delta, asset2Delta, lpDelta: lpsIssued, extraComputeFee, priceDelta };
};

const A_PRECISION = BigInt(1000000);

function getD(tokenAmounts: Array<number>, amplificationFactor: number): number[] | undefined {
  let N_COINS = tokenAmounts.length;
  let S = BigInt(0);
  let Dprev = BigInt(0);

  for (var _x of Array.from(tokenAmounts)) {
    S += BigInt(_x);
  }
  if (S == BigInt(0)) {
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
      if (D - Dprev <= BigInt(1)) {
        return [Number(D), _i];
      }
    } else {
      if (Dprev - D <= BigInt(1)) {
        return [Number(D), _i];
      }
    }
  }
}

function getY(
  i: number,
  j: number,
  x: number,
  tokenAmounts: number[],
  D: number,
  amplificationFactor: number
): number[] | undefined {
  let N_COINS = tokenAmounts.length;
  let Ann = BigInt(amplificationFactor * Math.pow(N_COINS, N_COINS));
  let c = BigInt(D);
  let S = BigInt(0);
  let _x = BigInt(0);
  let y_prev = BigInt(0);

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

function getAmplificationFactor({
  t,
  initialAmplificationFactor,
  futureAmplificationFactor,
  initialAmplificationFactorTime,
  futureAmplificationFactorTime,
}): number {
  if (futureAmplificationFactorTime && t < futureAmplificationFactorTime) {
    return Math.floor(
      initialAmplificationFactor +
        ((futureAmplificationFactor - initialAmplificationFactor) * (t - initialAmplificationFactor)) /
          (futureAmplificationFactorTime - initialAmplificationFactorTime)
    );
  }

  return futureAmplificationFactor;
}

interface cristalBall {
  ({}: { stable1Supply: number; stable2Supply: number; stableIn: number; amountIn: number }): Promise<{
    toConvert: number;
    toGet: number;
    extraFeeSwap: number;
  }>;
}

export const cristalBall: cristalBall = async ({ stable1Supply, stable2Supply, stableIn, amountIn }) => {
  let toConvert = Math.floor(amountIn / 2);
  let deltaError = 2;
  let targetRatio = stable1Supply / stable2Supply;
  let tokenRatio = 1;
  let toGet, extraFeeSwap, loopBreaker = 0;

  while (deltaError > 1.01 || deltaError < 0.99) {
    // in some edge cases with too small a zap amount, deltaError will never fall below 1%
    // in that case metazap will fail during the mint operation in the nanopool
    loopBreaker += 1;
    if(loopBreaker > 10) throw new Error ("Metazap not possible, increase metazap amount")
    const { asset2Delta, asset1Delta, extraComputeFee } = await getNanoSwapExactForQuote({
      stable1Supply,
      stable2Supply,
      swapInAssetId: stableIn,
      swapInAmount: toConvert,
    });
    extraFeeSwap = extraComputeFee;
    if (stableIn === stable1) {
      toGet = asset2Delta;
      targetRatio = (stable1Supply + toConvert) / (stable2Supply - toGet);
      tokenRatio = (amountIn - toConvert) / toGet;
      deltaError = tokenRatio / targetRatio;
      toConvert = Math.floor(toConvert * Math.sqrt(deltaError));
    } else {
      toGet = asset1Delta;
      targetRatio = (stable1Supply - toGet) / (stable2Supply + toConvert);
      tokenRatio = toGet / (amountIn - toConvert);
      deltaError = tokenRatio / targetRatio;
      toConvert = Math.floor(toConvert / Math.sqrt(deltaError));
    }
    console.log("deltaError:", deltaError);
  }
  console.log("toConvert: ", toConvert, "toGet: ", toGet);
  return { toConvert, toGet, extraFeeSwap };
};
