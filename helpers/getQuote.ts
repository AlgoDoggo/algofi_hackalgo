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
import { binarySearch, getNanoMintQuote, getNanoSwapExactForQuote } from "../utils/stableSwapMath.js";

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
  // if x is the amount of stable-in to convert, s1 the supply of stable-in in the nanopool
  // x = (sqrt( s1 * ( s1 + amountIn)) - s1) * 10000 / 9975
  const { assetSupply, lTNanoSupply, stable1Supply, stable2Supply, metapoolLTIssued, lTNanoIssued } =
    await fetchPoolState();
  let stable1Amount, stable2Amount, x;
  let tradeQuote;
  let tradeAmt = 0;
  if (stableIn === stable1) {
    let objective = async function (dx:number) {
      const { asset2Delta: dy } = await getNanoSwapExactForQuote({
        stable1Supply,
        stable2Supply,
        swapInAssetId: stableIn,
        swapInAmount: dx,
      });
      return stable2Supply * amountIn + (stable1Supply + amountIn) * dy + stable2Supply * dx;
    };
    tradeAmt = await binarySearch(0, amountIn, objective);
  } else {
    let objective = async function (dy) {
      const { asset1Delta: dx } = await getNanoSwapExactForQuote({
        stable1Supply,
        stable2Supply,
        swapInAssetId: stableIn,
        swapInAmount: dy,
      });

      return stable1Supply * amountIn + stable1Supply * dy + (stable2Supply + amountIn) * dx;
    };
    tradeAmt = await binarySearch(0, amountIn, objective);
  }
  console.log(`Swap ${tradeAmt} of ${stableIn} token for optimal mint ratio`);
  if (tradeAmt > 1)
    tradeQuote = await getNanoSwapExactForQuote({
      stable1Supply,
      stable2Supply,
      swapInAssetId: stableIn,
      swapInAmount: tradeAmt,
    });

  const stable1SupplyAdj = stable1Supply - tradeQuote.asset1Delta;
  const stable2SupplyAdj = stable2Supply - tradeQuote.asset2Delta;

  let whatIfDelta1 = (stableIn === stable1 ? amountIn : 0) + tradeQuote.asset1Delta;
  let whatIfDelta2 = (stableIn === stable2 ? amountIn : 0) + tradeQuote.asset2Delta;

  let poolQuote = await getNanoMintQuote({
    assetId: stableIn,
    assetAmount: whatIfDelta1,
    whatIfDelta1,
    whatIfDelta2,
    stable1Supply: stable1SupplyAdj,
    stable2Supply: stable2SupplyAdj,
  });
  // stableOut estimated
  return console.log(poolQuote);

  // estimate how much LTNano we'll get
  const { amountOut: LTNanoToBurn } = await getSwapQuote({ asset: assetID, assetAmount: amountIn });

  //estimate how much stable coins we'll get from burning LTNano

  const stable1Out = (BigInt(stable1Supply) * BigInt(LTNanoToBurn)) / BigInt(lTNanoIssued);
  const stable2Out = (BigInt(stable2Supply) * BigInt(LTNanoToBurn)) / BigInt(lTNanoIssued);
  //estimate the stable swap in the nanopool
  // amount_out = (asset_in_amount * 9975 * asset_out_supply) / ((asset_in_supply * 10000) + (asset_in_amount * 9975))
  if (stableIn === stable1) {
    const amount_out =
      (BigInt(stable2Out) * 9975n * BigInt(stable1Supply)) /
      (BigInt(stable2Supply) * 10000n + BigInt(stable2Out) * 9975n);
    const stableOutAmount = Number(stable1Out + amount_out);
    console.log(`Metaswapping ${amountIn} asset will get you ${stableOutAmount} stable1 token`);
    return { stableOutAmount };
  }
  if (stableIn === stable2) {
    const amount_out =
      (BigInt(stable1Out) * 9975n * BigInt(stable2Supply)) /
      (BigInt(stable1Supply) * 10000n + BigInt(stable1Out) * 9975n);
    const stableOutAmount = Number(stable2Out + amount_out);
    console.log(`Metaswapping ${amountIn} asset will get you ${stableOutAmount} stable1 token`);
    return { stableOutAmount };
  }
  throw new Error("Error, input params invalid");
};
