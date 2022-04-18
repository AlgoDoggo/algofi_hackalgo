import {
  assignGroupID,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
  waitForConfirmation,
} from "algosdk";
import dotenv from "dotenv";
import { setupClient } from "../src/adapters/algoD.js"
import { nanoLT, metapoolLT, metapool_app, assetID, metapool_address } from "../src/constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

interface Burn {
  ({}: { burnAmount: number | bigint }): Promise<{ assetOut: number; nanoLTOut: number }>;
}

const burn: Burn = async ({ burnAmount }) => {
  if (!burnAmount) throw new Error("invalid burn amount");
  const account = mnemonicToSecretKey(process.env.Mnemo!);
  let algodClient = setupClient();
  const params = await algodClient.getTransactionParams().do();

  params.fee = 1000;
  params.flatFee = true;

  const tx0 = makeApplicationNoOpTxnFromObject({
    suggestedParams: {
      ...params,
      fee: params.fee * 3, //(fee + get assetID + get nanoLT)
    },
    from: account.addr,
    appIndex: metapool_app,
    appArgs: [enc.encode("burn")],
    foreignAssets: [assetID, nanoLT, metapoolLT],
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
  const transactionResponse = await waitForConfirmation(algodClient, txId, 5);
  const innerTX = transactionResponse["inner-txns"].map((t) => t.txn);
  const { aamt: assetOut } = innerTX?.find((i) => i?.txn?.xaid === assetID)?.txn;
  const { aamt: nanoLTOut } = innerTX?.find((i) => i?.txn?.xaid === nanoLT)?.txn;
  console.log(`Burned ${burnAmount} metapool LT, received ${assetOut} asset and ${nanoLTOut} nanopool LT`);
  return { assetOut, nanoLTOut };
};
export default burn;
