import { setupClient } from "../adapters/algoD.js";
import fs from "fs";
import {
  assignGroupID,
  getApplicationAddress,
  makeApplicationCreateTxnFromObject,
  makeApplicationNoOpTxnFromObject,
  makeApplicationOptInTxnFromObject,
  makePaymentTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
  OnApplicationComplete,
  waitForConfirmation,
} from "algosdk";
import dotenv from "dotenv";
import { AF_NANO_POOL_USDC_STBL_TESTNET, STBL_TESTNET, USDC_TESTNET, assetID_testnet } from "../constants/constants.js";
dotenv.config();

const optinTest = async () => {
  try {
    const account = mnemonicToSecretKey(process.env.Mnemo);
    const algodClient = setupClient();
    const suggestedParams = await algodClient.getTransactionParams().do();

    const appId = 81759190;
    const dog = 62483717;
    //return console.log(getApplicationAddress(67935586))

    const appBootstrap = makeApplicationNoOpTxnFromObject({
      suggestedParams: {
        ...suggestedParams,
        flatFee: true,
        fee: 3000,
      },
      from: account.addr,
      appIndex: appId,
      foreignAssets: [62483717],
      appArgs: [new Uint8Array(Buffer.from("optin", "utf-8"))],
    });

    let txSigned = appBootstrap.signTxn(account.sk);
    await algodClient.sendRawTransaction(txSigned).do();
  } catch (error) {
    console.error(error.message);
  }
};

optinTest();
