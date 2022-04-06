import algosdk, {
  assignGroupID,
  encodeUint64,
  getApplicationAddress,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  makePaymentTxnWithSuggestedParamsFromObject,
} from "algosdk";
import dotenv from "dotenv";
import fs from "fs";
import { setupClient } from "../adapters/algoD.js";
import {
  AF_NANO_POOL_USDC_STBL,
  DoggoAppIndex as appIndex,
  managerID_dex,
  managerID_dex_TESTNET,
  managerID_nanoswap_TESTNET,
  STBL,
  StblUsdcAppId,
  USDC,
} from "../constants/constants.js";

dotenv.config();

async function burn() {
  try {
    const account = algosdk.mnemonicToSecretKey(process.env.Mnemo);

    const enc = new TextEncoder();

    let algodClient = setupClient();

    const params = await algodClient.getTransactionParams().do();

    params.fee = 1000;
    params.flatFee = true;

    const argsBurnAsset1 = [enc.encode("ba1o")]; // second arg is minimum amount to receive
    const argsBurnAsset2 = [enc.encode("ba2o")]; // second arg is minimum amount to receive

    const feePool = 0;

    const tx0 = makeAssetTransferTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        ...params,
      },
      from: account.addr,
      to: getApplicationAddress(StblUsdcAppId),
      assetIndex: AF_NANO_POOL_USDC_STBL,
      amount: 100,
    });

    const tx1 = makeApplicationNoOpTxnFromObject({
      
      suggestedParams: {
        ...params,
        fee: params.fee * 2,
      },
      from: account.addr,
      appIndex: StblUsdcAppId,
      appArgs: argsBurnAsset1,
      foreignAssets: [USDC], 
    });

    const tx2 = makeApplicationNoOpTxnFromObject({
    
      suggestedParams: {
        ...params,
        fee: params.fee * 2,
      },
      from: account.addr,
      appIndex: StblUsdcAppId,
      appArgs: argsBurnAsset2,
      foreignAssets: [STBL],
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
export default burn;

burn();
