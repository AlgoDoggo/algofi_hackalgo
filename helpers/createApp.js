import { setupClient } from "../adapters/algoD.js";
import fs from "fs";
import {
  assignGroupID,
  getApplicationAddress,
  makeApplicationClearStateTxnFromObject,
  makeApplicationCreateTxnFromObject,
  makeApplicationNoOpTxnFromObject,
  makeApplicationOptInTxnFromObject,
  makePaymentTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
  OnApplicationComplete,
  waitForConfirmation,
} from "algosdk";
import dotenv from "dotenv";
import { appTeal } from "../contracts/appTeal.js";
import {  
  assetID_testnet,
  D981_d552_testnet_app,
  managerID_nanoswap_TESTNET,
  D981_D552_LTNANO_TESTNET,
  D552,
  D981,
} from "../constants/constants.js";
dotenv.config();

const createApp = async () => {
  try {
    const account = mnemonicToSecretKey(process.env.Mnemo);
    const algodClient = setupClient();
    const suggestedParams = await algodClient.getTransactionParams().do();

    const compileApp = await algodClient
      .compile(
        appTeal({
          assetID: assetID_testnet,
          stable1: D981,
          stable2: D552,
          lTNano: D981_D552_LTNANO_TESTNET,
          stable1Stable2AppId: D981_d552_testnet_app,
          stable1Stable2AppAddress: getApplicationAddress(D981_d552_testnet_app),
          managerID_nanoswap: managerID_nanoswap_TESTNET,
        })
      )
      .do();

    const clearState = fs.readFileSync(new URL("../contracts/clearProg.teal", import.meta.url), "utf8");
    const compiledClearProg = await algodClient.compile(clearState).do();

    const tx = makeApplicationCreateTxnFromObject({
      suggestedParams,
      from: account.addr,
      approvalProgram: new Uint8Array(Buffer.from(compileApp.result, "base64")),
      clearProgram: new Uint8Array(Buffer.from(compiledClearProg.result, "base64")),
      numGlobalByteSlices: 0,
      numGlobalInts: 1,
      numLocalByteSlices: 0,
      numLocalInts: 0,
      onComplete: OnApplicationComplete.NoOpOC,
    });

    let txSigned = tx.signTxn(account.sk);
    const { txId } = await algodClient.sendRawTransaction(txSigned).do();
    const transactionResponse = await waitForConfirmation(algodClient, txId, 5);
    const appId = transactionResponse["application-index"];
    console.log("Created new app-id: ", appId);

    // bootstrap it
    //const appId = 82478041
    

    const bootstrap = makePaymentTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        ...suggestedParams,
        flatFee: true,
        fee: 6000,
      },
      from: account.addr,
      to: getApplicationAddress(appId),
      amount: 10 ** 6,
    });

    const appBootstrap = makeApplicationNoOpTxnFromObject({
      suggestedParams,
      from: account.addr,
      appIndex: appId,
      foreignAssets: [D981, D552, D981_D552_LTNANO_TESTNET, assetID_testnet],
      appArgs: [new Uint8Array(Buffer.from("bootstrap", "utf-8"))],
    });

    const transactions = [bootstrap, appBootstrap];
    assignGroupID(transactions);  

    txSigned = transactions.map((t) => t.signTxn(account.sk));
    
    await algodClient.sendRawTransaction(txSigned).do();
  } catch (error) {
    console.error(error.message);
  }
};

createApp();
