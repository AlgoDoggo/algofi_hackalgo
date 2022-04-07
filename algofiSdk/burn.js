import {
  assignGroupID,
  getApplicationAddress,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
} from "algosdk";
import dotenv from "dotenv";
import { setupClient } from "../adapters/algoD.js";
import { D981_d552_testnet_app, D981, D552, D981_D552_LTNANO_TESTNET } from "../constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

async function burn() {
  try {
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
      to: getApplicationAddress(D981_d552_testnet_app),
      assetIndex: D981_D552_LTNANO_TESTNET,
      amount: 10,
    });

    const tx1 = makeApplicationNoOpTxnFromObject({
      suggestedParams: {
        ...params,
        fee: params.fee * 2,
      },
      from: account.addr,
      appIndex: D981_d552_testnet_app,
      appArgs: argsBurnAsset1,
      foreignAssets: [D981],
    });

    const tx2 = makeApplicationNoOpTxnFromObject({
      suggestedParams: {
        ...params,
        fee: params.fee * 2,
      },
      from: account.addr,
      appIndex: D981_d552_testnet_app,
      appArgs: argsBurnAsset2,
      foreignAssets: [D552],
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

burn();
