import {
  assignGroupID,
  encodeUint64,
  makeApplicationNoOpTxnFromObject,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  mnemonicToSecretKey,
  waitForConfirmation,
} from "algosdk";
import dotenv from "dotenv";
import { setupClient } from "./adapters/algoD.js";
import { nanoLT, metapoolLT, metapool_app, assetID, metapool_address } from "./constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

interface Mint {
  ({}: { optIn?: boolean; assetID_amount: number | bigint; nanoLT_amount: number | bigint; maxSlippage: number }): 
  Promise<{ mintAmount: number; redeemAmount: number; redeemAsset: number; }>;
}

const mint: Mint = async ({ optIn, assetID_amount, nanoLT_amount, maxSlippage }) => {
  if (!assetID_amount || !nanoLT_amount || !maxSlippage) throw new Error("invalid mint parameters");
  const account = mnemonicToSecretKey(process.env.Mnemo!); // ! Non-null assertion operator
  let algodClient = setupClient();
  const params = await algodClient.getTransactionParams().do();

  params.fee = 1000;
  params.flatFee = true;

  if (optIn) {
    const optIn = makeAssetTransferTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        ...params,
      },
      from: account.addr,
      assetIndex: metapoolLT,
      to: account.addr,
      amount: 0,
    });

    const optInSigned = optIn.signTxn(account.sk);
    await algodClient.sendRawTransaction(optInSigned).do();
  }

  const tx0 = makeApplicationNoOpTxnFromObject({
    suggestedParams: {
      ...params,
      fee: params.fee * 3, // (fee + get Metapool token + get excess amount)
    },
    from: account.addr,
    appIndex: metapool_app,
    // second arg is max slippage in %. We'll follow Algofi's convention and consider 1% = 10000
    appArgs: [enc.encode("mint"), encodeUint64(maxSlippage)],
    foreignAssets: [assetID, nanoLT, metapoolLT],
  });

  const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    assetIndex: assetID,
    to: metapool_address,
    amount: assetID_amount,
  });

  const tx2 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    to: metapool_address,
    assetIndex: nanoLT,
    amount: nanoLT_amount,
  });

  const transactions = [tx0, tx1, tx2];
  assignGroupID(transactions);
  const signedTxs = transactions.map((t) => t.signTxn(account.sk));
  const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
  let transactionResponse = await waitForConfirmation(algodClient, txId, 5);
  const innerTX = transactionResponse["inner-txns"].map((t) => t.txn);
  const { aamt: mintAmount } = innerTX?.find((i) => i?.txn?.xaid === metapoolLT)?.txn;
  const { aamt: redeemAmount, xaid: redeemAsset } = innerTX?.find((i) => i?.txn?.xaid === assetID || i?.txn?.xaid === nanoLT)
    ?.txn ?? { aamt: 0, xaid: "" };
  console.log("minted:", mintAmount, "metapool liquidity token");
  if (redeemAmount) console.log(`redeemed: ${redeemAmount} of ${redeemAsset} token`);

  return { mintAmount, redeemAmount, redeemAsset };
};
export default mint;
