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
    metapoolLT,
    metapool_app_TESTNET,
    STBL,
    StblUsdcAppId,
    test,
    USDC,
  } from "../constants/constants.js";
  
  dotenv.config();
  
  async function mint() {
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
      const optIn = makeAssetTransferTxnWithSuggestedParamsFromObject({
        suggestedParams: {
          ...params,
        },
        from: account.addr,
        assetIndex: metapoolLT,
        to: account.addr,
        amount: 0,
      });
     
      const optInSigned = optIn.signTxn(account.sk)
      await algodClient.sendRawTransaction(optInSigned).do()

      const tx0 = makeApplicationNoOpTxnFromObject({        
        suggestedParams: {
          ...params,
          fee: params.fee * 3, //(fee + get Metapool token + get excess amount)
        },
        from: account.addr,
        appIndex: metapool_app_TESTNET,
        appArgs: [enc.encode("mint")],
        foreignAssets: [test, D981_D552_LTNANO_TESTNET, metapoolLT],
      });

      const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
        suggestedParams: {
          ...params,
        },
        from: account.addr,
        assetIndex: test,
        to: getApplicationAddress(metapool_app_TESTNET),
        amount: 1000,
      });
      
      const tx2 = makeAssetTransferTxnWithSuggestedParamsFromObject({
        suggestedParams: {
          ...params,
        },
        from: account.addr,
        to: getApplicationAddress(metapool_app_TESTNET),
        assetIndex: D981_D552_LTNANO_TESTNET,
        amount: 2000,
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
  export default mint;
  
  mint()
  