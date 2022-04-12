import {
  assignGroupID,
  encodeUint64,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
  waitForConfirmation,
} from "algosdk";
import dotenv from "dotenv";
import { setupClient } from "../adapters/algoD.js";
import { lTNano, metapoolLT, metapool_app, assetID, metapool_address } from "../constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

interface Swap {
  asset: number;
  amount: number | bigint;
  minAmountOut: number | bigint;
}

async function swap({ asset, amount, minAmountOut }: Swap) {
  if (!asset || !amount) throw new Error("invalid swap parameters");
  const account = mnemonicToSecretKey(process.env.Mnemo!);
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
    foreignAssets: [assetID, lTNano, metapoolLT],
  });

  const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    assetIndex: asset,
    to: metapool_address,
    amount,
  });

  const transactions = [tx0, tx1];
  assignGroupID(transactions);
  const signedTxs = transactions.map((t) => t.signTxn(account.sk));
  const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
  const transactionResponse = await waitForConfirmation(algodClient, txId, 5);
  const innerTX = transactionResponse["inner-txns"].map((t) => t.txn);
  const { aamt: amountOut, xaid: assetOut } = innerTX[0]?.txn;
  if (asset === assetID) {
    console.log(`Swapped ${amount} asset for ${amountOut} nanopool LT`);
  } else {
    console.log(`Swapped ${amount} nanopool LT for ${amountOut} asset`);
  }
  return { amountOut, assetOut };
}
export default swap;

swap({ amount: 100, asset: assetID, minAmountOut: 1 }).catch((error) => console.log(error.message));
