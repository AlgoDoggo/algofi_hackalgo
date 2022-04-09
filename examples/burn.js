import {
  assignGroupID,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
} from "algosdk";
import dotenv from "dotenv";
import { setupClient } from "../adapters/algoD.js";
import { LTNano, metapoolLT, metapool_app, assetID, metapool_address } from "../constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

const burn = async ({ burnAmount }) => {
  if (!burnAmount) throw new Error("invalid burn amount");
  const account = mnemonicToSecretKey(process.env.Mnemo);
  let algodClient = setupClient();
  const params = await algodClient.getTransactionParams().do();

  params.fee = 1000;
  params.flatFee = true;

  const tx0 = makeApplicationNoOpTxnFromObject({
    suggestedParams: {
      ...params,
      fee: params.fee * 3, //(fee + get assetID + get ltNano)
    },
    from: account.addr,
    appIndex: metapool_app,
    appArgs: [enc.encode("burn")],
    foreignAssets: [assetID, LTNano, metapoolLT],
  });

  const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    assetIndex: metapoolLT,
    to: metapool_address,
    amount: burnAmount,
  });

  const transactions = [tx0, tx1];
  assignGroupID(transactions);
  const signedTxs = transactions.map((t) => t.signTxn(account.sk));
  const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
  console.log("burn transaction ID:", txId);
};
export default burn;

//burn({ burnAmount: 10 }).catch((error) => console.log(error.message));
