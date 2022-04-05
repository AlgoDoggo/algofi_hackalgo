import algosdk, {
    decodeUint64,
    encodeUint64,
    getApplicationAddress,
    makeApplicationNoOpTxnFromObject,
    makeAssetTransferTxnWithSuggestedParamsFromObject,
    makePaymentTxnWithSuggestedParamsFromObject,
  } from "algosdk";
  import dotenv from "dotenv";
  import { setupClient } from "../adapters/algoD.js";
  import {
    D552,
    D981,
    D981_D552_LTNANO_TESTNET,
    D981_d552_testnet_app,
    managerID_dex,
    managerID_nanoswap,
    managerID_nanoswap_TESTNET,
    metapool_testnet_app,
    STBL,
    StblUsdcAppId,
    test,
    USDC,
  } from "../constants/constants.js";
  
  dotenv.config();
  
  async function metazap() {
    try {
      const account = algosdk.mnemonicToSecretKey(process.env.Mnemo);
  
      const enc = new TextEncoder();
      const notePlainText = "fee";
      const note = enc.encode(notePlainText);
  
      let algodClient = setupClient();  
      
      const params = await algodClient.getTransactionParams().do();
  
      params.fee = 1000;
      params.flatFee = true;

  
      // appArgs:["metaswap", int minimumAmountOut]
  
      const argsMetaswap = [enc.encode("metazap"), encodeUint64(90)];

      const tx0 = makePaymentTxnWithSuggestedParamsFromObject({
        suggestedParams: {
          ...params,
        },
        from: account.addr,
        to: getApplicationAddress(metapool_testnet_app),
        amount: 11000,
      });
      
      const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
        suggestedParams: {
          ...params,
          fee: 1000,
        },
        from: account.addr,
        to: getApplicationAddress(metapool_testnet_app),
        assetIndex: D981,
        amount: 10**6,
      });
  
      const tx2 = makeApplicationNoOpTxnFromObject({
        // swap exact for
        suggestedParams: {
          ...params,
          fee: params.fee * 6, //(fee is at least 5x for nanoswap 2x for regular swap)
        },
        from: account.addr,
        //appIndex: StblUsdcAppId,//D981_d552_testnet_app,
        appIndex: metapool_testnet_app,
        appArgs: argsMetaswap,
        accounts: [getApplicationAddress(D981_d552_testnet_app)],
        foreignAssets: [test, D981_D552_LTNANO_TESTNET, D981, D552],
        foreignApps: [D981_d552_testnet_app, managerID_nanoswap_TESTNET],
      });
  
      const transactions = [tx0, tx1, tx2];
  
      algosdk.assignGroupID(transactions);
  
      const signedTxs = transactions.map((t) => t.signTxn(account.sk));
  
      const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
      console.log("transaction ID:", txId);
    } catch (error) {
      return console.log(error.message);
    }
  }
  export default metazap;
  
  metazap()
  