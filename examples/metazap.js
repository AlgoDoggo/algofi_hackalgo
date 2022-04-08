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
  D552,
  D981,
  D981_D552_LTNANO_TESTNET,
  D981_d552_testnet_app,
  managerID_nanoswap_TESTNET,
  metapool_app_TESTNET,
  test,
} from "../constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

async function metazap() {
  try {
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
      to: getApplicationAddress(metapool_app_TESTNET),
      amount: 11000,
    });

    const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        ...params,
      },
      from: account.addr,
      to: getApplicationAddress(metapool_app_TESTNET),
      assetIndex: D981,
      amount: 1000,
    });

    const tx2 = makeApplicationNoOpTxnFromObject({
      suggestedParams: {
        ...params,
        fee: params.fee * 6, //(fee is at least 5x for nanoswap 2x for regular swap)
      },
      from: account.addr,
      appIndex: metapool_app_TESTNET,
      // appArgs:["metazap", int minimumAmountOut]
      appArgs: [enc.encode("metazap"), encodeUint64(90)],
      accounts: [getApplicationAddress(D981_d552_testnet_app)],
      foreignAssets: [test, D981_D552_LTNANO_TESTNET, D981, D552],
      foreignApps: [D981_d552_testnet_app, managerID_nanoswap_TESTNET],
    });

    const transactions = [tx0, tx1, tx2];
    assignGroupID(transactions);
    const signedTxs = transactions.map((t) => t.signTxn(account.sk));
    const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
    console.log("transaction ID:", txId);
  } catch (error) {
    return console.log(error.message);
  }
}
export default metazap;

metazap();
