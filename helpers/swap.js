import algosdk, {
  encodeUint64,
  getApplicationAddress,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
} from "algosdk";
import dotenv from "dotenv";
import { setupClient } from "../adapters/algoD.js";
import {
  D552,
  D981,
  D981_d552_testnet_app,
  managerID_dex,
  managerID_nanoswap,
  managerID_nanoswap_TESTNET,
  STBL,
  StblUsdcAppId,
  USDC,
} from "../constants/constants.js";

dotenv.config();

async function swap() {
  try {
    const account = algosdk.mnemonicToSecretKey(process.env.Mnemo);

    const enc = new TextEncoder();
    const notePlainText = "fee";
    const note = enc.encode(notePlainText);

    let algodClient = setupClient();

    const params = await algodClient.getTransactionParams().do();

    params.fee = 1000;
    params.flatFee = true;

    //"sef" for swap exact for
    //"sfe" for swap for exact, ie with a redeemTX at the end
    //"rsr" for swap for exact, ie with a redeemTX at the end
    const argsSef = [enc.encode("sef"), encodeUint64(1)]; // second arg is minimum amount to receive
    const argsSfe = [enc.encode("sfe"), encodeUint64(6)]; // second arg is amount to receive
    const argsRsr = [enc.encode("rsr")];

    const tx0 = makeAssetTransferTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        ...params,
        fee:1000,
      },
      from: account.addr,
      to: getApplicationAddress(D981_d552_testnet_app),
      //to: getApplicationAddress(StblUsdcAppId),
      //assetIndex: STBL,
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
      //appIndex: StblUsdcAppId,//D981_d552_testnet_app,
      appIndex: D981_d552_testnet_app,
      appArgs: argsSef,
      //foreignAssets: [USDC],
      foreignAssets: [D981],
      //foreignApps:[managerID_nanoswap],
      foreignApps:[managerID_nanoswap_TESTNET],
    });

    const transactions = [tx0, tx1];

    algosdk.assignGroupID(transactions);

    const signedTxs = transactions.map((t) => t.signTxn(account.sk));

    const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
    console.log("transaction ID:", txId);
  } catch (error) {
    return console.log(error.message);
  }
}
export default swap;
