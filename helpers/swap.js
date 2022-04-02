import algosdk, { encodeUint64, getApplicationAddress } from "algosdk";
import dotenv from "dotenv";
import fs from "fs";
import { setupClient } from "../adapters/algoD.js";
import { DoggoAppIndex as appIndex, managerID_dex, managerID_dex_TESTNET, managerID_nanoswap_TESTNET } from "../constants/constants.js";

dotenv.config();


async function swap() {
  try {
    const captchaMnemo = process.env.Mnemo;
    var captchaAccount = algosdk.mnemonicToSecretKey(captchaMnemo);   


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
    const argsSef = [enc.encode("sef"), encodeUint64(1)];// second arg is minimum amount to receive
    const argsSfe = [enc.encode("sfe"), encodeUint64(6)];// second arg is amount to receive
    const argsRsr = [enc.encode("rsr")];// second arg is amount to receive

    const feePool = 0
    
    
    const tx0 = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        ...params,
      },
      from: captchaAccount.addr,
      to: getApplicationAddress(appIndex),
      amount:10**6,
      note,
    });

    const tx1 = algosdk.makeApplicationNoOpTxnFromObject({ // swap exact for
      suggestedParams: {
        ...params,
        fee: params.fee*2
      },
      from: captchaAccount.addr,
      appIndex,
      appArgs: argsSef,
      foreignAssets: [77279142],//[352658929],
      foreignApps: [managerID_nanoswap_TESTNET],// [managerID_dex_TESTNET]
    });

    // const tx1 = algosdk.makeApplicationNoOpTxnFromObject({ // swap for exact
    //   suggestedParams: {
    //     ...params,
    //     fee: params.fee*2
    //   },
    //   from: captchaAccount.addr,
    //   appIndex,
    //   appArgs: argsSfe,
    //   foreignApps: [dexAppId],
    //   foreignAssets: [352658929],
    // });
    
    // const tx2 = algosdk.makeApplicationNoOpTxnFromObject({ // swap for exact
    //   suggestedParams: {
    //     ...params,
    //     fee: params.fee*2
    //   },
    //   from: captchaAccount.addr,
    //   appIndex,
    //   appArgs: argsRsr,
    //   foreignApps: [dexAppId],
    //  // foreignAssets: [352658929],
    // });
    
    const transactions = [tx0, tx1];
    //const transactionsSfe = [tx0, tx1,tx2];
 
    algosdk.assignGroupID(transactions);
    //const transactionsGroupedSfe = algosdk.assignGroupID(transactionsSfe);
    

    // const t0 = tx0.signTxn(captchaAccount.sk);   
    // const t1 = tx1.signTxn(captchaAccount.sk);
    // const t2 = tx2.signTxn(captchaAccount.sk);

    const signedTxs= transactions.map((t)=>t.signTxn(captchaAccount.sk))
   
    const { txId } = await algodClient.sendRawTransaction(signedTxs).do();    
    //const { txId } = await algodClient.sendRawTransaction([t0, t1, t2]).do();    
    console.log("transaction ID:", txId);
  } catch (error) {
    return console.log(error.message);
  }
}
export default swap;
