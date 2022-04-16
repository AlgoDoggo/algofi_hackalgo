import {
  assignGroupID,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
} from "algosdk";
import dotenv from "dotenv";
import { setupClient } from "../src/adapters/algoD.js";
import { stable1_stable2_app, stable1, stable2, lTNano, nanopool_address } from "../src/constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

async function burn() {
  const account = mnemonicToSecretKey(process.env.Mnemo);
  let algodClient = setupClient();
  const params = await algodClient.getTransactionParams().do();

  params.fee = 1000;
  params.flatFee = true;

  const argsBurnAsset1 = [enc.encode("ba1o")];
  const argsBurnAsset2 = [enc.encode("ba2o")];

  const tx0 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    to: nanopool_address,
    assetIndex: lTNano,
    amount: 10,
  });

  const tx1 = makeApplicationNoOpTxnFromObject({
    suggestedParams: {
      ...params,
      fee: params.fee * 2,
    },
    from: account.addr,
    appIndex: stable1_stable2_app,
    appArgs: argsBurnAsset1,
    foreignAssets: [stable1],
  });

  const tx2 = makeApplicationNoOpTxnFromObject({
    suggestedParams: {
      ...params,
      fee: params.fee * 2,
    },
    from: account.addr,
    appIndex: stable1_stable2_app,
    appArgs: argsBurnAsset2,
    foreignAssets: [stable2],
  });

  const transactions = [tx0, tx1, tx2];
  assignGroupID(transactions);
  const signedTxs = transactions.map((t) => t.signTxn(account.sk));
  const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
  console.log("transaction ID:", txId);
}

burn().catch((error) => console.log(error.message));
