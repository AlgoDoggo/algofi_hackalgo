import { setupClient } from "../adapters/algoD.js";
import fs from "fs";
import {
  assignGroupID,
  getApplicationAddress,
  makeApplicationCreateTxnFromObject,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  makePaymentTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
  OnApplicationComplete,
  signTransaction,
  waitForConfirmation,
} from "algosdk";
import dotenv from "dotenv";
import { appTeal } from "../contracts/appTeal.js";
import {
  assetID,
  stable1_stable2_app,
  managerID_nanoswap,
  lTNano,
  stable2,
  stable1,
  nanopool_address,
} from "../constants/constants.js";
dotenv.config();

const createApp = async () => {
  const account = mnemonicToSecretKey(process.env.Mnemo!);
  const algodClient = setupClient();
  const suggestedParams = await algodClient.getTransactionParams().do();

  const compileApp = await algodClient
    .compile(
      appTeal({
        assetID: assetID,
        stable1: stable1,
        stable2: stable2,
        lTNano: lTNano,
        stable1Stable2AppId: stable1_stable2_app,
        stable1Stable2AppAddress: nanopool_address,
        managerID_nanoswap: managerID_nanoswap,
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
    numGlobalInts: 2,
    numLocalByteSlices: 0,
    numLocalInts: 0,
    onComplete: OnApplicationComplete.NoOpOC,
  });

  let txSigned = tx.signTxn(account.sk);
  let { txId } = await algodClient.sendRawTransaction(txSigned).do();
  let transactionResponse = await waitForConfirmation(algodClient, txId, 5);
  const appId = transactionResponse["application-index"];
  console.log("Created metapool app: ", appId);

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
    foreignAssets: [stable1, stable2, lTNano, assetID],
    appArgs: [new Uint8Array(Buffer.from("bootstrap", "utf-8"))],
  });
  const transactions = [bootstrap, appBootstrap];
  assignGroupID(transactions);
  txSigned = transactions.map((t) => signTransaction(t, account.sk));
  const txIdAppCall = txSigned[1].txID;
  await algodClient.sendRawTransaction(txSigned.map((t) => t.blob)).do();
  transactionResponse = await waitForConfirmation(algodClient, txIdAppCall, 5);
  const { ["asset-index"]: metapoolLT } = transactionResponse["inner-txns"].find((e) => e["asset-index"]);
  console.log("Created Metapool liquity token: ", metapoolLT);

  const optIn = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams,
    from: account.addr,
    assetIndex: metapoolLT,
    to: account.addr,
    amount: 0,
  });

  const optInSigned = optIn.signTxn(account.sk);
  await algodClient.sendRawTransaction(optInSigned).do();

  console.log("successfully opted-in metapool liquidity token");
};

createApp().catch((error) => console.log(error.message));
