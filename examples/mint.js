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

async function mint() {
  try {
    const account = mnemonicToSecretKey(process.env.Mnemo);
    let algodClient = setupClient();
    const params = await algodClient.getTransactionParams().do();

    params.fee = 1000;
    params.flatFee = true;

    const optIn = makeAssetTransferTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        ...params,
      },
      from: account.addr,
      assetIndex: metapoolLT,
      to: account.addr,
      amount: 0,
    });

    const optInSigned = optIn.signTxn(account.sk);
    await algodClient.sendRawTransaction(optInSigned).do();

    const tx0 = makeApplicationNoOpTxnFromObject({
      suggestedParams: {
        ...params,
        fee: params.fee * 3, // (fee + get Metapool token + get excess amount)
      },
      from: account.addr,
      appIndex: metapool_app_TESTNET,
      // second arg is max slippage in %. We'll follow Algofi's convention and scale it by 10000
      appArgs: [enc.encode("mint"), encodeUint64(1000000)],
      foreignAssets: [test, D981_D552_LTNANO_TESTNET, metapoolLT],
    });

    const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        ...params,
      },
      from: account.addr,
      assetIndex: test,
      to: getApplicationAddress(metapool_app_TESTNET),
      amount: 1000,
    });

    const tx2 = makeAssetTransferTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        ...params,
      },
      from: account.addr,
      to: getApplicationAddress(metapool_app_TESTNET),
      assetIndex: D981_D552_LTNANO_TESTNET,
      amount: 2000,
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
export default mint;

mint();
