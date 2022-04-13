import axios from "axios";
import {
  assetID,
  lTNano,
  metapoolLT,
  metapool_address,
  metapool_app,
  nanopool_address,
  stable1,
  stable2,
} from "../constants/constants.js";
import { cristalBall, getNanoMintQuote, getNanoSwapExactForQuote } from "../utils/stableSwapMath.js";

export const fetchPoolState = async () => {
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

  const { data: nanopoolData } = await axios.get(`${baseUrl}/accounts/${nanopool_address}`).catch(function (error) {
    throw new Error(
      error?.response?.data ? `error: ${error.response.status}  ${JSON.stringify(error.response.data)}` : error?.message
    );
  });

  const { amount: stable1Supply } = nanopoolData?.account?.assets?.find((array) => array["asset-id"] === stable1);
  const { amount: stable2Supply } = nanopoolData?.account?.assets?.find((array) => array["asset-id"] === stable2);
  const { amount: lTNanoLeft } = nanopoolData?.account?.assets?.find((array) => array["asset-id"] === lTNano);

  const lTNanoIssued = Number(2n ** 64n - 1n - BigInt(lTNanoLeft.toString()));

  if (!stable1Supply || !stable2Supply) throw new Error("Error, assets not found in the metapool");

  return { assetSupply, lTNanoSupply, stable1Supply, stable2Supply, metapoolLTIssued, lTNanoIssued };
};

type MintQuote = {
  assetID_amount?: number;
  lTNano_amount?: number;
};

export const getMintQuote = async ({ assetID_amount, lTNano_amount }: MintQuote) => {
  if (!assetID_amount && !lTNano_amount) throw new Error("Error, input params needed");
  const { assetSupply, lTNanoSupply, metapoolLTIssued } = await fetchPoolState();
  let lTNano_needed, assetID_needed;
  if (assetID_amount) {
    lTNano_needed = Math.floor((assetID_amount * lTNanoSupply) / assetSupply);
    assetID_needed = Math.floor(assetID_amount);
  } else if (lTNano_amount) {
    assetID_needed = Math.floor((lTNano_amount * assetSupply) / lTNanoSupply);
    lTNano_needed = Math.floor(lTNano_amount);
  }
  // 	Metapool LT out = Math.min(
  // 	assetID amount * issued Metapool LT / assetID supply,
  // 	lTNano amount * issued Metapool LT / lTNano supply
  // )
  const expectedMintAmount = Math.floor(
    Math.min((assetID_needed * metapoolLTIssued) / assetSupply, (lTNano_needed * metapoolLTIssued) / lTNanoSupply)
  );
  console.log(
    `Send ${assetID_needed} asset and ${lTNano_needed} nanopool LT to receive ${expectedMintAmount} metapool LT`
  );
  return { assetID_needed, lTNano_needed, expectedMintAmount };
};

export const getBurnQuote = async (burnAmount) => {
  const { assetSupply, lTNanoSupply, metapoolLTIssued } = await fetchPoolState();
  // assetID out = assetID supply * burn amount / issued amount of Metapool LT
  // lTNano out = lTNano supply * burn amount / issued amount of Metapool LT
  const assetOut = (assetSupply * burnAmount) / metapoolLTIssued;
  const lTNanoOut = (lTNanoSupply * burnAmount) / metapoolLTIssued;
  console.log(
    `You will receive ${assetOut.toPrecision(4)} asset and ${lTNanoOut.toPrecision(
      4
    )} nanopool LT for burning ${burnAmount} metapool LT`
  );
  return { assetOut, lTNanoOut };
};

export const getSwapQuote = async ({ asset, assetAmount }) => {
  const { assetSupply, lTNanoSupply } = await fetchPoolState();
  //  amount_out = (asset_in_amount * 9975 * asset_out_supply) / ((asset_in_supply * 10000) + (asset_in_amount * 9975))
  if (asset === assetID) {
    const amount_out = Number(
      (BigInt(assetAmount) * 9975n * BigInt(lTNanoSupply)) /
        (BigInt(assetSupply) * 10000n + BigInt(assetAmount) * 9975n)
    );
    console.log(`Send ${assetAmount} asset, you will receive ${amount_out} nanopool LT`);
    return { amountOut: amount_out, assetOut: lTNano };
  }
  if (asset === lTNano) {
    const amount_out = Number(
      (BigInt(assetAmount) * 9975n * BigInt(assetSupply)) /
        (BigInt(lTNanoSupply) * 10000n + BigInt(assetAmount) * 9975n)
    );
    console.log(`Send ${assetAmount} nanopool LT, you will receive ${amount_out} asset`);
    return { amountOut: amount_out, assetOut: assetID };
  }
  throw new Error("Error, input params invalid");
};

export const getMetaSwapQuote = async ({ amountIn, stableOut }) => {
  if (stableOut !== stable1 && stableOut !== stable2) throw new Error("Input params invalid");
  // estimate how much LTNano we'll get
  const { amountOut: LTNanoToBurn } = await getSwapQuote({ asset: assetID, assetAmount: amountIn });

  //estimate how much stable coins we'll get from burning LTNano
  const { stable1Supply, stable2Supply, lTNanoIssued } = await fetchPoolState();

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
    });
    extraFee = extraComputeFee;
    stableOutAmount = stable1Out + asset1Delta;
  } else if (stableOut === stable2) {
    const { asset2Delta, extraComputeFee } = await getNanoSwapExactForQuote({
      stable1Supply,
      stable2Supply,
      swapInAssetId: stable1,
      swapInAmount: stable1Out,
    });
    extraFee = extraComputeFee;
    stableOutAmount = stable2Out + asset2Delta;
  }
  console.log(`Metaswapping ${amountIn} asset will get you ${stableOutAmount} ${stableOut} token`);
  console.log(`Extra compute fee : ${extraFee}`);
  return { stableOutAmount, extraFee };
};

export const getMetaZapQuote = async ({ amountIn, stableIn }) => {
  if (stableIn !== stable1 && stableIn !== stable2) throw new Error("Stablecoin input invalid");

  const { stable1Supply, stable2Supply } = await fetchPoolState();

  const { toConvert, toGet, extraFeeSwap } = await cristalBall({ stable1Supply, stable2Supply, stableIn, amountIn });

  let stable1SupplyAdj, stable2SupplyAdj;
  if (stableIn === stable1) {
    stable1SupplyAdj = stable1Supply + toConvert;
    stable2SupplyAdj = stable2Supply - toGet;
  } else {
    stable1SupplyAdj = stable1Supply - toGet;
    stable2SupplyAdj = stable2Supply + toConvert;
  }

  const { lpDelta, extraComputeFee: extraFeeMint  } = await getNanoMintQuote({
    assetId: stableIn,
    assetAmount: Math.floor(amountIn - toConvert),
    stable1Supply: stable1SupplyAdj,
    stable2Supply: stable2SupplyAdj,
  });
  console.log(`extra compute fee for nanoswap: ${extraFeeSwap}`);
  console.log(`extra compute fee for nanomint: ${extraFeeMint}`);
  const { amountOut } = await getSwapQuote({ asset: lTNano, assetAmount: lpDelta });
  console.log(`Metazapping ${amountIn} ${stableIn} stablecoin will yield ${amountOut} asset`);
  return { amountOut, extraFeeMint,extraFeeSwap, toConvert };
};
