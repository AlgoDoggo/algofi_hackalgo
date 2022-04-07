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
import { D552, D981, D981_d552_testnet_app, managerID_nanoswap_TESTNET } from "../constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

async function swap() {
  try {
    const account = mnemonicToSecretKey(process.env.Mnemo);
    let algodClient = setupClient();
    const params = await algodClient.getTransactionParams().do();

    params.fee = 1000;
    params.flatFee = true;

    //"sef" for swap exact for
    //"sfe" for swap for exact, ie with a redeemTX at the end
    //"rsr" for swap for exact, ie with a redeemTX at the end
    const argsSef = [enc.encode("sef"), encodeUint64(0)]; // second arg is minimum amount to receive
    const argsSfe = [enc.encode("sfe"), encodeUint64(10)]; // second arg is amount to receive
    const argsRsr = [enc.encode("rsr")];

    const tx0 = makeAssetTransferTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        ...params,
        fee: 1000,
      },
      from: account.addr,
      to: getApplicationAddress(D981_d552_testnet_app),
      assetIndex: D552,
      amount: 10,
    });

    const tx1 = makeApplicationNoOpTxnFromObject({
      // swap exact for
      suggestedParams: {
        ...params,
        fee: params.fee * 5, //(fee is 5x for nanoswap 2x for regular swap)
      },
      from: account.addr,
      appIndex: D981_d552_testnet_app,
      appArgs: argsSef,
      foreignAssets: [D981],
      foreignApps: [managerID_nanoswap_TESTNET],
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
