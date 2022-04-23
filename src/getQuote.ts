import {
  assetID,
  nanoLT,
  metapool_address,
  metapool_app,
  stable1,
  stable1_stable2_app,
  stable2,
} from "./constants/constants.js";
import {
  cristalBall,
  getAmplificationFactor,
  getNanoMintQuote,
  getNanoSwapExactForQuote,
} from "./helpers/stableSwapMath.js";
import { setupIndexer } from "./adapters/algoD.js";

export const fetchPoolStates = async (): Promise<{
  assetSupply: number;
  nanoLTSupply: number;
  stable1Supply: number;
  stable2Supply: number;
  metapoolLTIssued: number;
  nanoLTIssued: number;
  initialAmplificationFactor: number;
  futureAmplificationFactor: number;
  initialAmplificationFactorTime: number;
  futureAmplificationFactorTime: number;
}> => {
  const indexer = setupIndexer();

  const assets = await indexer.lookupAccountAssets(metapool_address).do();
  const { amount: assetSupply } = assets?.assets?.find((array) => array["asset-id"] === assetID);
  const { amount: nanoLTSupply } = assets?.assets?.find((array) => array["asset-id"] === nanoLT);
  if (!assetSupply || !nanoLTSupply) throw new Error("Error, assets not found in the metapool");

  const app = await indexer.lookupApplications(metapool_app).do();
  const metapoolLTIssued = app?.application?.params?.["global-state"].find((g) => g.key === "aXNzdWVkIE1ldGFwb29sIExU")
    ?.value?.uint;

  const nanoApp = await indexer.lookupApplications(stable1_stable2_app).do();
  const nanopoolState = nanoApp?.application?.params?.["global-state"];
  const stable1Supply = nanopoolState.find((g) => g.key === "YjE=")?.value?.uint;
  const stable2Supply = nanopoolState.find((g) => g.key === "YjI=")?.value?.uint;
  const nanoLTIssued = nanopoolState.find((g) => g.key === "bGM=")?.value?.uint;
  const initialAmplificationFactor = nanopoolState.find((g) => g.key === "aWFm")?.value?.uint;
  const futureAmplificationFactor = nanopoolState.find((g) => g.key === "ZmFm")?.value?.uint;
  const initialAmplificationFactorTime = nanopoolState.find((g) => g.key === "aWF0")?.value?.uint;
  const futureAmplificationFactorTime = nanopoolState.find((g) => g.key === "ZmF0")?.value?.uint;

  if (!stable1Supply || !stable2Supply) throw new Error("Error, assets not found in the nanopool");

  return {
    assetSupply,
    nanoLTSupply,
    stable1Supply,
    stable2Supply,
    metapoolLTIssued,
    nanoLTIssued,
    initialAmplificationFactor,
    futureAmplificationFactor,
    initialAmplificationFactorTime,
    futureAmplificationFactorTime,
  };
};

interface MintQuote {
  ({}: { assetID_amount?: number; nanoLT_amount?: number }): Promise<{
    assetID_needed: number;
    nanoLT_needed: number;
    expectedMintAmount: number;
  }>;
}

export const getMintQuote: MintQuote = async ({ assetID_amount, nanoLT_amount }) => {
  if (!assetID_amount && !nanoLT_amount) throw new Error("Error, input params needed");
  const { assetSupply, nanoLTSupply, metapoolLTIssued } = await fetchPoolStates().catch(() => {
    return { assetSupply: 1, nanoLTSupply: 1, metapoolLTIssued: 1 };
  });

  let nanoLT_needed, assetID_needed;
  if (assetID_amount) {
    nanoLT_needed = Math.floor((assetID_amount * nanoLTSupply) / assetSupply);
    assetID_needed = Math.floor(assetID_amount);
  } else if (nanoLT_amount) {
    assetID_needed = Math.floor((nanoLT_amount * assetSupply) / nanoLTSupply);
    nanoLT_needed = Math.floor(nanoLT_amount);
  }
  const expectedMintAmount = Math.floor(
    Math.min((assetID_needed * metapoolLTIssued) / assetSupply, (nanoLT_needed * metapoolLTIssued) / nanoLTSupply)
  );
  console.log(
    `Send ${assetID_needed} asset and ${nanoLT_needed} nanopool LT to receive ${expectedMintAmount} metapool LT`
  );
  return { assetID_needed, nanoLT_needed, expectedMintAmount };
};

export const getBurnQuote = async (burnAmount: number): Promise<{ assetOut: number; nanoLTOut: number }> => {
  const { assetSupply, nanoLTSupply, metapoolLTIssued } = await fetchPoolStates();
  const assetOut = Math.floor((assetSupply * burnAmount) / metapoolLTIssued);
  const nanoLTOut = Math.floor((nanoLTSupply * burnAmount) / metapoolLTIssued);
  console.log(`You will receive ${assetOut} asset and ${nanoLTOut} nanopool LT for burning ${burnAmount} metapool LT`);
  return { assetOut, nanoLTOut };
};

interface SwapQuote {
  ({}: { asset: number; assetAmount: number }): Promise<{ amountOut: number; assetOut: number }>;
}

export const getSwapQuote: SwapQuote = async ({ asset, assetAmount }) => {
  const { assetSupply, nanoLTSupply } = await fetchPoolStates();
  if (asset === assetID) {
    const amount_out = Number(
      (BigInt(assetAmount) * 9975n * BigInt(nanoLTSupply)) /
        (BigInt(assetSupply) * 10000n + BigInt(assetAmount) * 9975n)
    );
    console.log(`Send ${assetAmount} asset, you will receive ${amount_out} nanopool LT`);
    return { amountOut: amount_out, assetOut: nanoLT };
  }
  if (asset === nanoLT) {
    const amount_out = Number(
      (BigInt(assetAmount) * 9975n * BigInt(assetSupply)) /
        (BigInt(nanoLTSupply) * 10000n + BigInt(assetAmount) * 9975n)
    );
    console.log(`Send ${assetAmount} nanopool LT, you will receive ${amount_out} asset`);
    return { amountOut: amount_out, assetOut: assetID };
  }
  throw new Error("Error, input params invalid");
};

interface MetaswapQuote {
  ({}: { amountIn: number; stableOut: number }): Promise<{ stableOutAmount: number; extraFee: number }>;
}

export const getMetaSwapQuote: MetaswapQuote = async ({ amountIn, stableOut }) => {
  if (stableOut !== stable1 && stableOut !== stable2) throw new Error("Input params invalid");
  // estimate how much nanoLT we'll get
  const { amountOut: nanoLTToBurn } = await getSwapQuote({ asset: assetID, assetAmount: amountIn });

  //estimate how much stable coins we'll get from burning nanoLT
  const {
    stable1Supply,
    stable2Supply,
    nanoLTIssued,
    initialAmplificationFactor,
    futureAmplificationFactor,
    initialAmplificationFactorTime,
    futureAmplificationFactorTime,
  } = await fetchPoolStates();

  const amplificationFactor = getAmplificationFactor({
    t: Math.floor(Date.now() / 1000),
    initialAmplificationFactor,
    futureAmplificationFactor,
    initialAmplificationFactorTime,
    futureAmplificationFactorTime,
  });

  const stable1Out = Number((BigInt(stable1Supply) * BigInt(nanoLTToBurn)) / BigInt(nanoLTIssued));
  const stable2Out = Number((BigInt(stable2Supply) * BigInt(nanoLTToBurn)) / BigInt(nanoLTIssued));
  //estimate the stable swap in the nanopool
  console.log(`Burning ${nanoLTToBurn} nanopool LT will yield ${stable1Out} stable1 and ${stable2Out} stable2`);

  let stableOutAmount!: number, extraFee!: number;

  if (stableOut === stable1) {
    const { asset1Delta, extraComputeFee } = await getNanoSwapExactForQuote({
      stable1Supply,
      stable2Supply,
      swapInAssetId: stable2,
      swapInAmount: stable2Out,
      amplificationFactor,
    });
    extraFee = extraComputeFee;
    stableOutAmount = stable1Out + asset1Delta;
  } else if (stableOut === stable2) {
    const { asset2Delta, extraComputeFee } = await getNanoSwapExactForQuote({
      stable1Supply,
      stable2Supply,
      swapInAssetId: stable1,
      swapInAmount: stable1Out,
      amplificationFactor,
    });
    extraFee = extraComputeFee;
    stableOutAmount = stable2Out + asset2Delta;
  }
  console.log(`Metaswapping ${amountIn} asset will get you ${stableOutAmount} ${stableOut} token`);
  console.log(`Extra compute fee : ${extraFee}`);
  return { stableOutAmount, extraFee };
};

interface MetaZapQuote {
  ({}: { amountIn: number; stableIn: number }): Promise<{
    amountOut: number;
    extraFeeMint: number;
    extraFeeSwap: number;
    toConvert: number;
  }>;
}

export const getMetaZapQuote: MetaZapQuote = async ({ amountIn, stableIn }) => {
  if (stableIn !== stable1 && stableIn !== stable2) throw new Error("Stablecoin input invalid");

  const {
    stable1Supply,
    stable2Supply,
    nanoLTIssued,
    initialAmplificationFactor,
    futureAmplificationFactor,
    initialAmplificationFactorTime,
    futureAmplificationFactorTime,
  } = await fetchPoolStates();

  const amplificationFactor = getAmplificationFactor({
    t: Math.floor(Date.now() / 1000),
    initialAmplificationFactor,
    futureAmplificationFactor,
    initialAmplificationFactorTime,
    futureAmplificationFactorTime,
  });

  const { toConvert, toGet, extraFeeSwap } = await cristalBall({
    stable1Supply,
    stable2Supply,
    stableIn,
    amountIn,
    amplificationFactor,
  });

  let stable1SupplyAdj, stable2SupplyAdj;
  if (stableIn === stable1) {
    stable1SupplyAdj = stable1Supply + toConvert;
    stable2SupplyAdj = stable2Supply - toGet;
  } else {
    stable1SupplyAdj = stable1Supply - toGet;
    stable2SupplyAdj = stable2Supply + toConvert;
  }

  const mintParams = {
    stable1Supply: stable1SupplyAdj,
    stable2Supply: stable2SupplyAdj,
    amplificationFactor,
    nanoLTIssued,
  };

  let extraFeeMint, mintAmount;
  let { asset1Delta, asset2Delta, lpDelta, extraComputeFee } = await getNanoMintQuote({
    assetId: stableIn,
    assetAmount: Math.floor(amountIn - toConvert),
    ...mintParams,
  });
  (mintAmount = lpDelta), (extraFeeMint = extraComputeFee);

  if (stableIn === stable1 && Math.abs(asset2Delta) > toGet) {
    let { lpDelta, extraComputeFee } = await getNanoMintQuote({
      assetId: stable2,
      assetAmount: Math.floor(toGet),
      ...mintParams,
    });
    (mintAmount = lpDelta), (extraFeeMint = extraComputeFee);
  } else if (stableIn === stable2 && Math.abs(asset1Delta) > toGet) {
    let { lpDelta, extraComputeFee } = await getNanoMintQuote({
      assetId: stable1,
      assetAmount: Math.floor(toGet),
      ...mintParams,
    });
    (mintAmount = lpDelta), (extraFeeMint = extraComputeFee);
  }

  console.log(`extra compute fee for nanoswap: ${extraFeeSwap}`);
  console.log(`extra compute fee for nanomint: ${extraFeeMint}`);
  const { amountOut } = await getSwapQuote({ asset: nanoLT, assetAmount: mintAmount });
  console.log(`Metazapping ${amountIn} ${stableIn} stablecoin will yield ${amountOut} asset`);
  return { amountOut, extraFeeMint, extraFeeSwap, toConvert };
};
