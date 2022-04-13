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

interface Metazap {
  ({}: {
    stableToZap: number;
    zapAmount: number | bigint;
    minAssetToGet: number | bigint;
    toConvert: number | bigint;
    extraFeeSwap: number;
    extraFeeMint: number;
  }): Promise<{ assetOutAmount: number }>;
}

const metazap: Metazap = async ({
  stableToZap,
  zapAmount,
  minAssetToGet,
  toConvert = 0,
  extraFeeSwap = 2,
  extraFeeMint = 0,
}) => {
  if (!stableToZap || !zapAmount) throw new Error("invalid metazap parameters");
  const account = mnemonicToSecretKey(process.env.Mnemo!);
  let algodClient = setupClient();
  const suggestedParams = await algodClient.getTransactionParams().do();

  suggestedParams.fee = 1000;
  suggestedParams.flatFee = true;

  const tx0 = makePaymentTxnWithSuggestedParamsFromObject({
    suggestedParams,
    from: account.addr,
    to: metapool_address,
    amount: suggestedParams.fee * (13 + extraFeeSwap + extraFeeMint),
  });

  const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams,
    from: account.addr,
    to: metapool_address,
    assetIndex: stableToZap,
    amount: zapAmount,
  });

  const tx2 = makeApplicationNoOpTxnFromObject({
    suggestedParams,
    from: account.addr,
    appIndex: metapool_app,
    appArgs: [
      enc.encode("metazap"),
      encodeUint64(minAssetToGet),
      encodeUint64(toConvert), // telling the contract how much how stableIn to convert for stableOut before minting
      encodeUint64(extraFeeSwap),
      encodeUint64(extraFeeMint),
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
  const { aamt: assetOutAmount } = innerTX?.find((i) => i?.txn?.xaid === assetID)?.txn;
  console.log(`metazapped ${zapAmount} ${stableToZap} for ${assetOutAmount} asset`);
  return { assetOutAmount };
};
export default metazap;

metazap({
  stableToZap: stable1,
  zapAmount: 1000,
  minAssetToGet: 1,
  toConvert: 600,
  extraFeeSwap: 4,
  extraFeeMint: 3,
}).catch((error) => console.log(error.message));
