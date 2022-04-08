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

const mint = async ({ optIn, assetID_amount, LTNano_amount, maxSlippage }) => {
  if (!assetID_amount || !LTNano_amount || !maxSlippage) throw new Error("invalid mint parameters");
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
    foreignAssets: [assetID, LTNano, metapoolLT],
  });

  const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    assetIndex: assetID,
    to: getApplicationAddress(metapool_app),
    amount: assetID_amount,
  });

  const tx2 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
    },
    from: account.addr,
    to: getApplicationAddress(metapool_app),
    assetIndex: LTNano,
    amount: LTNano_amount,
  });

  const transactions = [tx0, tx1, tx2];
  assignGroupID(transactions);
  const signedTxs = transactions.map((t) => t.signTxn(account.sk));
  const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
  console.log("transaction ID:", txId);
};
export default mint;

// mint({ optIn: false, assetID_amount: 1000, LTNano_amount: 2000, maxSlippage: 1000000 }).catch((error) =>
//   console.log(error.message)
// );
