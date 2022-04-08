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
import {
  stable2,
  stable1,
  LTNano,
  stable1_stable2_app,
  managerID_nanoswap,
} from "../constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

async function mint() {
  const account = mnemonicToSecretKey(process.env.Mnemo);
  let algodClient = setupClient();
  const params = await algodClient.getTransactionParams().do();

  params.fee = 1000;
  params.flatFee = true;

  const argsMint = [enc.encode("p"), encodeUint64(10000)]; // pool string, slippage percent scaled by 10k
  const argsredeemMint1 = [enc.encode("rpa1r")];
  const argsredeemMint2 = [enc.encode("rpa2r")];

  const tx0 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
      fee: 1000,
    },
    from: account.addr,
    to: getApplicationAddress(stable1_stable2_app),
    assetIndex: stable1,
    amount: 50000,
  });

  const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
    suggestedParams: {
      ...params,
      fee: 1000,
    },
    from: account.addr,
    to: getApplicationAddress(stable1_stable2_app),
    assetIndex: stable2,
    amount: 50000,
  });

  const tx2 = makeApplicationNoOpTxnFromObject({
    suggestedParams: {
      ...params,
      fee: params.fee * 3,
    },
    from: account.addr,
    appIndex: stable1_stable2_app,
    appArgs: argsMint,
    foreignAssets: [LTNano],
    foreignApps: [managerID_nanoswap],
  });

  const tx3 = makeApplicationNoOpTxnFromObject({
    suggestedParams: {
      ...params,
      fee: 1000,
    },
    from: account.addr,
    appIndex: stable1_stable2_app,
    appArgs: argsredeemMint1,
    foreignAssets: [stable1],
  });

  const tx4 = makeApplicationNoOpTxnFromObject({
    suggestedParams: {
      ...params,
      fee: 1000,
    },
    from: account.addr,
    appIndex: stable1_stable2_app,
    appArgs: argsredeemMint2,
    foreignAssets: [stable2],
  });

  const transactions = [tx0, tx1, tx2, tx3, tx4];
  assignGroupID(transactions);
  const signedTxs = transactions.map((t) => t.signTxn(account.sk));
  const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
  console.log("transaction ID:", txId);
}

mint().catch((error) => console.log(error.message));
