import { setupClient } from "../adapters/algoD.js";
import { encodeUint64, getApplicationAddress, makeApplicationNoOpTxnFromObject, mnemonicToSecretKey } from "algosdk";
import { DoggoAppIndex as appIndex } from "../constants/constants.js";

const makeDeposit = async ({ amount, assetID }) => {
  try {
    const account = mnemonicToSecretKey(process.env.Mnemo);
    const algodClient = setupClient();
    let suggestedParams = await algodClient.getTransactionParams().do();

    const appAddr = getApplicationAddress(appIndex);
    
    const appArgs = [encodeUint64(amount)];
    const depositAlgo = makeApplicationNoOpTxnFromObject({
      suggestedParams,
      from: account.addr,
      appIndex,
      foreignAssets: assetID,
      appArgs,
      rekeyTo: appAddr,
    });

    const txSigned = depositAlgo.signTxn(account.sk);
    const { txId } = await algodClient.sendRawTransaction(txSigned).do();
    console.log("transaction ID:", txId);
  } catch (error) {
    console.error(error.message);
  }
};

export default makeDeposit;
