import {
  assignGroupID,
  encodeUint64,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  makePaymentTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
} from "algosdk";
import dotenv from "dotenv";
import { setupClient } from "../adapters/algoD.js";
import {
  stable2,
  stable1,
  LTNano,
  stable1_stable2_app,
  managerID_nanoswap,
  metapool_app,
  assetID,
  metapool_address,
  nanopool_address,
} from "../constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

async function metaswap({ assetAmount, stableMinReturn, stableID }) {
  if (!assetAmount || typeof stableMinReturn !== "number" || !stableID) throw new Error("invalid metaswap parameters");
  const account = mnemonicToSecretKey(process.env.Mnemo);
  let algodClient = setupClient();
  const params = await algodClient.getTransactionParams().do();

  params.fee = 1000;
  params.flatFee = true;

  // appArgs:["metaswap", int minimumAmountOut, assetOutID (stable1 or stable2) ]
  const argsMetaswap = [enc.encode("metaswap"), encodeUint64(stableMinReturn), encodeUint64(stableID)];

  const tx0 = makePaymentTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    to: metapool_address,
    amount: 12000,
  });

  const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    to: metapool_address,
    assetIndex: assetID,
    amount: assetAmount,
  });

  const tx2 = makeApplicationNoOpTxnFromObject({
    suggestedParams: {
      ...params,
      fee: params.fee * 2,
    },
    from: account.addr,
    appIndex: metapool_app,
    appArgs: argsMetaswap,
    accounts: [nanopool_address],
    foreignAssets: [assetID, LTNano, stable1, stable2],
    foreignApps: [stable1_stable2_app, managerID_nanoswap],
  });

  const transactions = [tx0, tx1, tx2];
  assignGroupID(transactions);
  const signedTxs = transactions.map((t) => t.signTxn(account.sk));
  const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
  console.log("metaswap transaction ID:", txId);
}
export default metaswap;

//metaswap({ assetAmount: 1000, stableID: stable1, stableMinReturn: 0 }).catch((error) => console.log(error.message));
