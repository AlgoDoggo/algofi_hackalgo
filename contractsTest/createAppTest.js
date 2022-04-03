import { setupClient } from "../adapters/algoD.js";
import fs from "fs";
import {
  assignGroupID,
  getApplicationAddress,
  makeApplicationCreateTxnFromObject,
  makeApplicationOptInTxnFromObject,
  makePaymentTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
  OnApplicationComplete,
  waitForConfirmation,
} from "algosdk";
import dotenv from "dotenv";
import { AF_NANO_POOL_USDC_STBL_TESTNET, STBL_TESTNET, USDC_TESTNET, assetID_testnet } from "../constants/constants.js";
dotenv.config();

const createAppTest = async () => {
  try {
    const account = mnemonicToSecretKey(process.env.Mnemo);
    const algodClient = setupClient();
    const suggestedParams = await algodClient.getTransactionParams().do();

    const app = fs.readFileSync(new URL("./app.teal", import.meta.url), "utf8");
    const compileApp = await algodClient.compile(app).do();    

    const clearState = fs.readFileSync(new URL("./clearProg.teal", import.meta.url), "utf8");
    const compiledClearProg = await algodClient.compile(clearState).do();

    const tx = makeApplicationCreateTxnFromObject({
      suggestedParams,
      from: account.addr,
      approvalProgram: new Uint8Array(Buffer.from(compileApp.result, "base64")),
      clearProgram: new Uint8Array(Buffer.from(compiledClearProg.result, "base64")),
      numGlobalByteSlices: 0,
      numGlobalInts: 0,
      numLocalByteSlices: 0,
      numLocalInts: 0,
      onComplete: OnApplicationComplete.NoOpOC,
    });

    let txSigned = tx.signTxn(account.sk);
    const { txId } = await algodClient.sendRawTransaction(txSigned).do();
    const transactionResponse = await waitForConfirmation(algodClient, txId, 5);
    const appId = transactionResponse["application-index"];
    console.log("Created new app-id: ", appId);

    
    const bootstrap = makePaymentTxnWithSuggestedParamsFromObject({
      suggestedParams:{
        ...suggestedParams,
        flatFee: true,
        fee: 1000
      },
      from: account.addr,
      to: getApplicationAddress(appId),
      amount: 10**6,
    });

    txSigned = bootstrap.signTxn(account.sk);
    await algodClient.sendRawTransaction(txSigned).do();
    return console.log(getApplicationAddress(appId))
    const appBootstrap = makeApplicationOptInTxnFromObject({
      suggestedParams,
      from: account.addr,
      appIndex: appId,
      foreignAssets:[STBL_TESTNET, USDC_TESTNET, AF_NANO_POOL_USDC_STBL_TESTNET, assetID_testnet],
      appArgs: [new Uint8Array(Buffer.from("bootstrap",'utf-8'))],      
    });

    const transactions = [bootstrap,appBootstrap]
    assignGroupID(transactions)

    txSigned = transactions.map((t)=> t.signTxn(account.sk));
    await algodClient.sendRawTransaction(txSigned).do();
  } catch (error) {
    console.error(error.message);
  }
};

createAppTest();
