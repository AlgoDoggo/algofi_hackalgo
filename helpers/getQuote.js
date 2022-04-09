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

  if (!stable1Supply || !stable2Supply) throw new Error("Error, assets not found in the metapool");

  //const assetPrice = lTNanoSupply / assetSupply;
  //console.log("1 test asset =", assetPrice.toPrecision(2), "Nano liquidity token");

  //console.log(data);
  return { assetSupply, lTNanoSupply, stable1Supply, stable2Supply, metapoolLTIssued };
};

export const getMintQuote = async () => {
  const { assetSupply, lTNanoSupply, stable1Supply, stable2Supply } = await fetchPoolState();

  const ratio = assetSupply / lTNanoSupply;
  console.log("supply 1 asset for", ratio, "lTNano");
  return ratio;
};
