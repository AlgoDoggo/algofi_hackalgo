import {
  assignGroupID,
  encodeUint64,
  getApplicationAddress,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
} from "algosdk";
import dotenv from "dotenv";
import { setupClient } from "../adapters/algoD.js";
import { D981_D552_LTNANO_TESTNET, metapoolLT, metapool_app_TESTNET, test } from "../constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

async function swap() {
  try {
    const account = mnemonicToSecretKey(process.env.Mnemo);
    let algodClient = setupClient();
    const params = await algodClient.getTransactionParams().do();

    params.fee = 1000;
    params.flatFee = true;

    const tx0 = makeApplicationNoOpTxnFromObject({
      suggestedParams: {
        ...params,
        fee: params.fee * 2, //(fee + get Metapool token + get excess amount)
      },
      from: account.addr,
      appIndex: metapool_app_TESTNET,
      // second arg is the minimum amount of asset out expected
      appArgs: [enc.encode("swap"), encodeUint64(9)],
      foreignAssets: [test, D981_D552_LTNANO_TESTNET, metapoolLT],
    });

    const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        ...params,
      },
      from: account.addr,
      assetIndex: D981_D552_LTNANO_TESTNET,
      to: getApplicationAddress(metapool_app_TESTNET),
      amount: 100,
    });

    const transactions = [tx0, tx1];
    assignGroupID(transactions);
    const signedTxs = transactions.map((t) => t.signTxn(account.sk));
    const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
    console.log("transaction ID:", txId);
  } catch (error) {
    return console.log(error.message);
  }
}
export default swap;

swap();
