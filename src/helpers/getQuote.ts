import axios from "axios";
import {
  assetID,
  lTNano,
  metapool_address,
  metapool_app,
  stable1,
  stable1_stable2_app,
  stable2,
} from "../constants/constants.js";
import { cristalBall, getAmplificationFactor, getNanoMintQuote, getNanoSwapExactForQuote } from "../utils/stableSwapMath.js";

export const fetchPoolStates = async (): Promise<{
  assetSupply: number;
  lTNanoSupply: number;
  stable1Supply: number;
  stable2Supply: number;
  metapoolLTIssued: number;
  lTNanoIssued: number;
  initialAmplificationFactor: number;
  futureAmplificationFactor: number;
  initialAmplificationFactorTime: number;
  futureAmplificationFactorTime: number;
}> => {
  const baseUrl = "https://testnet-idx.algonode.cloud/v2"; // algonode.io
  const { data: metapoolData } = await axios.get(`${baseUrl}/accounts/${metapool_address}`).catch(function (error) {
    throw new Error(
      error?.response?.data ? `error: ${error.response.status}  ${JSON.stringify(error.response.data)}` : error?.message
    );
  });

  const { amount: assetSupply } = metapoolData?.account?.assets?.find((array) => array["asset-id"] === assetID);
  const { amount: lTNanoSupply } = metapoolData?.account?.assets?.find((array) => array["asset-id"] === lTNano);

  const { data: metapoolAppData } = await axios.get(`${baseUrl}/applications/${metapool_app}`).catch(function (error) {
    throw new Error(
      error?.response?.data ? `error: ${error.response.status}  ${JSON.stringify(error.response.data)}` : error?.message
    );
  });

  const metapoolLTIssued = metapoolAppData?.application?.params?.["global-state"].find(
    (g) => g.key === "aXNzdWVkIE1ldGFwb29sIExU"
  )?.value?.uint;

  if (!assetSupply || !lTNanoSupply) throw new Error("Error, assets not found in the metapool");

  const { data: nanopoolAppData } = await axios
    .get(`${baseUrl}/applications/${stable1_stable2_app}`)
    .catch(function (error) {
      throw new Error(
        error?.response?.data ? `error: ${error.response.status}  ${JSON.stringify(error.response.data)}` : error?.message
      );
    });
  const nanopoolState = nanopoolAppData?.application?.params?.["global-state"];
  const stable1Supply = nanopoolState.find((g) => g.key === "YjE=")?.value?.uint;
  const stable2Supply = nanopoolState.find((g) => g.key === "YjI=")?.value?.uint;
  const lTNanoIssued = nanopoolState.find((g) => g.key === "bGM=")?.value?.uint;
  const initialAmplificationFactor = nanopoolState.find((g) => g.key === "aWFm")?.value?.uint;
  const futureAmplificationFactor = nanopoolState.find((g) => g.key === "ZmFm")?.value?.uint;
  const initialAmplificationFactorTime = nanopoolState.find((g) => g.key === "aWF0")?.value?.uint;
  const futureAmplificationFactorTime = nanopoolState.find((g) => g.key === "ZmF0")?.value?.uint;

  if (!stable1Supply || !stable2Supply) throw new Error("Error, assets not found in the nanopool");

  return {
    assetSupply,
    lTNanoSupply,
    stable1Supply,
    stable2Supply,
    metapoolLTIssued,
    lTNanoIssued,
    initialAmplificationFactor,
    futureAmplificationFactor,
    initialAmplificationFactorTime,
    futureAmplificationFactorTime,
  };
};

interface MintQuote {
  ({}: { assetID_amount?: number; lTNano_amount?: number }): Promise<{
    assetID_needed: number;
    lTNano_needed: number;
    expectedMintAmount: number;
  }>;
}

export const getMintQuote: MintQuote = async ({ assetID_amount, lTNano_amount }) => {
  if (!assetID_amount && !lTNano_amount) throw new Error("Error, input params needed");
  const { assetSupply, lTNanoSupply, metapoolLTIssued } = await fetchPoolStates().catch(() => {
    return { assetSupply: 1, lTNanoSupply: 1, metapoolLTIssued: 1 };
  });

  let lTNano_needed, assetID_needed;
  if (assetID_amount) {
    lTNano_needed = Math.floor((assetID_amount * lTNanoSupply) / assetSupply);
    assetID_needed = Math.floor(assetID_amount);
  } else if (lTNano_amount) {
    assetID_needed = Math.floor((lTNano_amount * assetSupply) / lTNanoSupply);
    lTNano_needed = Math.floor(lTNano_amount);
  }
  const expectedMintAmount = Math.floor(
    Math.min((assetID_needed * metapoolLTIssued) / assetSupply, (lTNano_needed * metapoolLTIssued) / lTNanoSupply)
  );
  console.log(`Send ${assetID_needed} asset and ${lTNano_needed} nanopool LT to receive ${expectedMintAmount} metapool LT`);
  return { assetID_needed, lTNano_needed, expectedMintAmount };
};

export const getBurnQuote = async (burnAmount: number): Promise<{ assetOut: number; lTNanoOut: number }> => {
  const { assetSupply, lTNanoSupply, metapoolLTIssued } = await fetchPoolStates();
  const assetOut = Math.floor((assetSupply * burnAmount) / metapoolLTIssued);
  const lTNanoOut = Math.floor((lTNanoSupply * burnAmount) / metapoolLTIssued);
  console.log(`You will receive ${assetOut} asset and ${lTNanoOut} nanopool LT for burning ${burnAmount} metapool LT`);
  return { assetOut, lTNanoOut };
};

interface SwapQuote {
  ({}: { asset: number; assetAmount: number }): Promise<{ amountOut: number; assetOut: number }>;
}

export const getSwapQuote: SwapQuote = async ({ asset, assetAmount }) => {
  const { assetSupply, lTNanoSupply } = await fetchPoolStates();
  if (asset === assetID) {
    const amount_out = Number(
      (BigInt(assetAmount) * 9975n * BigInt(lTNanoSupply)) / (BigInt(assetSupply) * 10000n + BigInt(assetAmount) * 9975n)
    );
    console.log(`Send ${assetAmount} asset, you will receive ${amount_out} nanopool LT`);
    return { amountOut: amount_out, assetOut: lTNano };
  }
  if (asset === lTNano) {
    const amount_out = Number(
      (BigInt(assetAmount) * 9975n * BigInt(assetSupply)) / (BigInt(lTNanoSupply) * 10000n + BigInt(assetAmount) * 9975n)
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
  // estimate how much LTNano we'll get
  const { amountOut: LTNanoToBurn } = await getSwapQuote({ asset: assetID, assetAmount: amountIn });

  //estimate how much stable coins we'll get from burning LTNano
  const {
    stable1Supply,
    stable2Supply,
    lTNanoIssued,
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

  const stable1Out = Number((BigInt(stable1Supply) * BigInt(LTNanoToBurn)) / BigInt(lTNanoIssued));
  const stable2Out = Number((BigInt(stable2Supply) * BigInt(LTNanoToBurn)) / BigInt(lTNanoIssued));
  //estimate the stable swap in the nanopool
  console.log(`Burning ${LTNanoToBurn} nanopool LT will yield ${stable1Out} stable1 and ${stable2Out} stable2`);

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
    lTNanoIssued,
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

  const { lpDelta, extraComputeFee: extraFeeMint } = await getNanoMintQuote({
    assetId: stableIn,
    assetAmount: Math.floor(amountIn - toConvert),
    stable1Supply: stable1SupplyAdj,
    stable2Supply: stable2SupplyAdj,
    amplificationFactor,
    lTNanoIssued,
  });
  console.log(`extra compute fee for nanoswap: ${extraFeeSwap}`);
  console.log(`extra compute fee for nanomint: ${extraFeeMint}`);
  const { amountOut } = await getSwapQuote({ asset: lTNano, assetAmount: lpDelta });
  console.log(`Metazapping ${amountIn} ${stableIn} stablecoin will yield ${amountOut} asset`);
  return { amountOut, extraFeeMint, extraFeeSwap, toConvert };
};
