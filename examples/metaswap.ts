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
import { setupClient } from "../adapters/algoD.js";
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
} from "../constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

interface Metaswap {
  assetAmount: number;
  stableMinReturn: number;
  stableOut: number;
  extraComputeFee: number
}

async function metaswap({ assetAmount, stableMinReturn, stableOut, extraComputeFee=0 }: Metaswap) {
  if (!assetAmount || typeof stableMinReturn !== "number" || !stableOut) throw new Error("invalid metaswap parameters");
  const account = mnemonicToSecretKey(process.env.Mnemo!);
  let algodClient = setupClient();
  const params = await algodClient.getTransactionParams().do();

  params.fee = 1000;
  params.flatFee = true;

  const tx0 = makePaymentTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    to: metapool_address,
    amount: 12000,
  });

  const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    to: metapool_address,
    assetIndex: assetID,
    amount: assetAmount,
  });

  const tx2 = makeApplicationNoOpTxnFromObject({
    suggestedParams: {
      ...params,
      fee: params.fee * 2,
    },
    from: account.addr,
    appIndex: metapool_app,
    // appArgs:["metaswap", int minimumAmountOut, assetOutID (stable1 or stable2), extracompute fee [0-5] ish ]
    appArgs: [
      enc.encode("metaswap"),
      encodeUint64(stableMinReturn),
      encodeUint64(stableOut),
      encodeUint64(extraComputeFee),
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
}
export default metaswap;

metaswap({ assetAmount: 100, stableOut: stable1, stableMinReturn: 0,extraComputeFee:5 }).catch((error) => console.log(error.message));
