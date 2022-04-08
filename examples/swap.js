import {
  assignGroupID,
  encodeUint64,
  getApplicationAddress,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
} from "algosdk";
import dotenv from "dotenv";
import { setupClient } from "../adapters/algoD.js";
import { LTNano, metapoolLT, metapool_app, assetID } from "../constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

async function swap({ asset, amount, minAmountOut }) {
  if (!asset || !amount) throw new Error("invalid swap parameters");
  const account = mnemonicToSecretKey(process.env.Mnemo);
  let algodClient = setupClient();
  const params = await algodClient.getTransactionParams().do();

  params.fee = 1000;
  params.flatFee = true;

  const tx0 = makeApplicationNoOpTxnFromObject({
    suggestedParams: {
      ...params,
      fee: params.fee * 2, //(fee + get Metapool token + get excess amount)
    },
    from: account.addr,
    appIndex: metapool_app,
    // second arg is the minimum amount of asset out expected
    appArgs: [enc.encode("swap"), encodeUint64(minAmountOut)],
    foreignAssets: [assetID, LTNano, metapoolLT],
  });

  const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    assetIndex: asset,
    to: getApplicationAddress(metapool_app),
    amount,
  });

  const transactions = [tx0, tx1];
  assignGroupID(transactions);
  const signedTxs = transactions.map((t) => t.signTxn(account.sk));
  const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
  console.log("transaction ID:", txId);
}
export default swap;

//swap({ amount: 100, asset: assetID, minAmountOut: 1 }).catch((error) => console.log(error.message));
