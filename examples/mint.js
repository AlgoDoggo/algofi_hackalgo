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

const mint = async ({ optIn, assetID_amount, lTNano_amount, maxSlippage }) => {
  if (!assetID_amount || !lTNano_amount || !maxSlippage) throw new Error("invalid mint parameters");
  const account = mnemonicToSecretKey(process.env.Mnemo);
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
    // second arg is max slippage in %. We'll follow Algofi's convention and scale it by 10000
    appArgs: [enc.encode("mint"), encodeUint64(maxSlippage)],
    foreignAssets: [assetID, lTNano, metapoolLT],
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
    assetIndex: lTNano,
    amount: lTNano_amount,
  });

  const transactions = [tx0, tx1, tx2];
  assignGroupID(transactions);
  const signedTxs = transactions.map((t) => t.signTxn(account.sk));
  const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
  let transactionResponse = await waitForConfirmation(algodClient, txId, 5);
  const innerTX = transactionResponse["inner-txns"].map((t) => t.txn);  
  const { aamt: mintAmount } = innerTX?.find((i) => i?.txn?.xaid === metapoolLT)?.txn;
  const { aamt: redeemAmount, xaid: redeemAsset } = innerTX?.find(
    (i) => i?.txn?.xaid === assetID || i?.txn?.xaid === lTNano
  )?.txn ?? { aamt: 0, xaid: "" };
  console.log("minted:", mintAmount, "metapool liquidity token");
  console.log(`redeemed: ${redeemAmount} of ${redeemAsset} token`);
  
  return { mintAmount, redeemAmount, redeemAsset };
};
export default mint;

// mint({ optIn: false, assetID_amount: 100, lTNano_amount: 200, maxSlippage: 1000000 }).catch((error) =>
//   console.log(error.message)
// );
