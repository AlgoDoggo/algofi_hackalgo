import axios from "axios";
import { assetID, LTNano, metapool_address } from "../constants/constants.js";

const getQuote = async () => {
  const { data } = await axios
    .get(`https://algoindexer.testnet.algoexplorerapi.io/v2/accounts/${metapool_address}`)
    .catch(function (error) {
      throw new Error(
        error?.response?.data
          ? `error: ${error.response.status}  ${JSON.stringify(error.response.data)}`
          : error?.message
      );
    });

  const { amount: assetAmount } = data?.account?.assets?.find((array) => array["asset-id"] === assetID);
  const { amount: LTNanoAmount } = data?.account?.assets?.find((array) => array["asset-id"] === LTNano);
  
  if (!assetAmount) throw new Error("Error the asset was not found in the metapool");

  const assetPrice = LTNanoAmount / assetAmount;
  console.log("1 test asset =", assetPrice.toPrecision(2), "Nano liquidity token");

  //console.log(data);
};
export default getQuote;
