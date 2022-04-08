import {
  assignGroupID,
  encodeUint64,
  getApplicationAddress,
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
} from "../constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

async function metazap({ stableToZap, zapAmount, minAssetToGet }) {
  if (!stableToZap || !zapAmount) throw new Error("invalid metazap parameters");
  const account = mnemonicToSecretKey(process.env.Mnemo);
  let algodClient = setupClient();
  const params = await algodClient.getTransactionParams().do();

  params.fee = 1000;
  params.flatFee = true;

  const tx0 = makePaymentTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    to: getApplicationAddress(metapool_app),
    amount: 11000,
  });

  const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    to: getApplicationAddress(metapool_app),
    assetIndex: stableToZap,
    amount: zapAmount,
  });

  const tx2 = makeApplicationNoOpTxnFromObject({
    suggestedParams: {
      ...params,
      fee: params.fee * 6, //(fee is at least 5x for nanoswap 2x for regular swap)
    },
    from: account.addr,
    appIndex: metapool_app,
    // appArgs:["metazap", int minimumAmountOut]
    appArgs: [enc.encode("metazap"), encodeUint64(minAssetToGet)],
    accounts: [getApplicationAddress(stable1_stable2_app)],
    foreignAssets: [assetID, LTNano, stable1, stable2],
    foreignApps: [stable1_stable2_app, managerID_nanoswap],
  });

  const transactions = [tx0, tx1, tx2];
  assignGroupID(transactions);
  const signedTxs = transactions.map((t) => t.signTxn(account.sk));
  const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
  console.log("transaction ID:", txId);
}
export default metazap;

//metazap({ stableToZap: stable1, zapAmount: 4, minAssetToGet: 0 }).catch((error) => console.log(error.message));
