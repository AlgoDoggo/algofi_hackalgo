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
    D552,
    D981,
    D981_D552_LTNANO_TESTNET,
    D981_d552_testnet_app,
    DoggoAppIndex as appIndex,
    managerID_dex,
    managerID_dex_TESTNET,
    managerID_nanoswap_TESTNET,
    STBL,
    StblUsdcAppId,
    USDC,
  } from "../constants/constants.js";
  
  dotenv.config();
  
  async function mint() {
    try {
      const account = algosdk.mnemonicToSecretKey(process.env.Mnemo);
  
      const enc = new TextEncoder();
  
      let algodClient = setupClient();
  
      const params = await algodClient.getTransactionParams().do();
  
      params.fee = 1000;
      params.flatFee = true;
  
      const argsMint = [enc.encode("p"), encodeUint64(10000)]; // pool string, slippage percent scaled by 10k
      const argsredeemMint1 = [enc.encode("rpa1r")]; // second arg is minimum amount to receive
      const argsredeemMint2 = [enc.encode("rpa2r")]; // second arg is minimum amount to receive
  
      const feePool = 0;
  
      const tx0 = makeAssetTransferTxnWithSuggestedParamsFromObject({
        suggestedParams: {
          ...params,
          fee: 1000,
        },
        from: account.addr,
        to: getApplicationAddress(D981_d552_testnet_app),
        assetIndex: D981,
        amount: 50000,
      });

      const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
        suggestedParams: {
          ...params,
          fee: 1000,
        },
        from: account.addr,
        to: getApplicationAddress(D981_d552_testnet_app),
        assetIndex: D552,
        amount: 50000,
      });
  
      const tx2 = makeApplicationNoOpTxnFromObject({
        
        suggestedParams: {
          ...params,
          fee: params.fee * 3,
        },
        from: account.addr,
        appIndex: D981_d552_testnet_app,
        appArgs: argsMint,
        foreignAssets: [D981_D552_LTNANO_TESTNET],
        foreignApps:[managerID_nanoswap_TESTNET]
      });
  
      const tx3 = makeApplicationNoOpTxnFromObject({
      
        suggestedParams: {
          ...params,
          fee: 1000,
        },
        from: account.addr,
        appIndex: D981_d552_testnet_app,
        appArgs: argsredeemMint1,
        foreignAssets: [D981],
      });

      const tx4 = makeApplicationNoOpTxnFromObject({
      
        suggestedParams: {
          ...params,
          fee: 1000,
        },
        from: account.addr,
        appIndex: D981_d552_testnet_app,
        appArgs: argsredeemMint2,
        foreignAssets: [D552],
      });
  
      const transactions = [tx0, tx1, tx2, tx3,tx4];
  
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
  