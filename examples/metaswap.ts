import {
  assignGroupID,
  encodeUint64,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  makePaymentTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
  signTransaction,
  waitForConfirmation,
} from "algosdk";
import dotenv from "dotenv";
import { setupClient } from "../src/adapters/algoD.js";
import {
  stable2,
  stable1,
  lTNano,
  stable1_stable2_app,
  managerID_nanoswap,
  metapool_app,
  assetID,
  metapool_address,
  nanopool_address,
} from "../src/constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

interface Metaswap {
  ({}: { assetAmount: number; stableMinReturn: number; stableOut: number; extraComputeFee: number }): Promise<{
    stableOutAmount: number;
  }>;
}

const metaswap: Metaswap = async ({ assetAmount, stableMinReturn = 0, stableOut, extraComputeFee = 2 }) => {
  if (!assetAmount || typeof stableMinReturn !== "number" || !stableOut) throw new Error("invalid metaswap parameters");
  const account = mnemonicToSecretKey(process.env.Mnemo!);
  let algodClient = setupClient();
  const suggestedParams = await algodClient.getTransactionParams().do();

  suggestedParams.fee = 1000;
  suggestedParams.flatFee = true;

  // Fee pooling currently not possible with nanopools, this tx compensates the metapool.
  const tx0 = makePaymentTxnWithSuggestedParamsFromObject({
    suggestedParams,
    from: account.addr,
    to: metapool_address,
    amount: suggestedParams.fee * (8 + extraComputeFee),
  });

  const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams,
    from: account.addr,
    to: metapool_address,
    assetIndex: assetID,
    amount: assetAmount,
  });

  const tx2 = makeApplicationNoOpTxnFromObject({
    suggestedParams,
    from: account.addr,
    appIndex: metapool_app,
    appArgs: [
      enc.encode("metaswap"),
      encodeUint64(stableMinReturn), // minimum asset out expected
      encodeUint64(stableOut), // stable coin we want to metaswap our asset for
      encodeUint64(extraComputeFee), // extra fee required by the nanopool for accurate swapping
    ],
    accounts: [nanopool_address],
    foreignAssets: [assetID, lTNano, stable1, stable2],
    foreignApps: [stable1_stable2_app, managerID_nanoswap],
  });

  const transactions = [tx0, tx1, tx2];
  assignGroupID(transactions);
  const signedTxs = transactions.map((t) => signTransaction(t, account.sk));
  await algodClient.sendRawTransaction(signedTxs.map((t) => t.blob)).do();
  const transactionResponse = await waitForConfirmation(algodClient, signedTxs[2].txID, 5);
  const innerTX = transactionResponse["inner-txns"].map((t) => t.txn);
  const { aamt: stableOutAmount } = innerTX?.find((i) => i?.txn?.xaid === stableOut)?.txn;
  console.log(`Metaswapped ${assetAmount} asset for ${stableOutAmount} of ${stableOut} stablecoin`);
  return { stableOutAmount };
};
export default metaswap;