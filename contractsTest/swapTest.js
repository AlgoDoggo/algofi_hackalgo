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
import { AF_NANO_POOL_USDC_STBL_TESTNET, STBL_TESTNET, USDC_TESTNET, assetID_testnet, managerID_dex_TESTNET } from "../constants/constants.js";
dotenv.config();

const swapTest = async () => {
  try {
    const account = mnemonicToSecretKey(process.env.Mnemo);
    const algodClient = setupClient();
    const suggestedParams = await algodClient.getTransactionParams().do();

    const appId = 81759190;
    const dog = 62483717;
    const dogManagerId = 67935586
    const enc = new TextEncoder();
    
    const appBootstrap = makeApplicationNoOpTxnFromObject({
      suggestedParams: {
        ...suggestedParams,
        flatFee: true,
        fee: 6000,
      },
      from: account.addr,
      appIndex: appId,
      foreignAssets: [dog],
      accounts: [getApplicationAddress(dogManagerId)],
      foreignApps:[dogManagerId, managerID_dex_TESTNET], //first 
      appArgs: [enc.encode("yo")],
    });

    let txSigned = appBootstrap.signTxn(account.sk);
    await algodClient.sendRawTransaction(txSigned).do();
  } catch (error) {
    console.error(error.message);
  }
};

swapTest();
