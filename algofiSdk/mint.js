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
  D552,
  D981,
  D981_D552_LTNANO_TESTNET,
  D981_d552_testnet_app,
  managerID_nanoswap_TESTNET,
} from "../constants/constants.js";

dotenv.config();
const enc = new TextEncoder();

async function mint() {
  try {
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
      to: getApplicationAddress(D981_d552_testnet_app),
      assetIndex: D981,
      amount: 50000,
    });

    const tx1 = makeAssetTransferTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        ...params,
        fee: 1000,
      },
      from: account.addr,
      to: getApplicationAddress(D981_d552_testnet_app),
      assetIndex: D552,
      amount: 50000,
    });

    const tx2 = makeApplicationNoOpTxnFromObject({
      suggestedParams: {
        ...params,
        fee: params.fee * 3,
      },
      from: account.addr,
      appIndex: D981_d552_testnet_app,
      appArgs: argsMint,
      foreignAssets: [D981_D552_LTNANO_TESTNET],
      foreignApps: [managerID_nanoswap_TESTNET],
    });

    const tx3 = makeApplicationNoOpTxnFromObject({
      suggestedParams: {
        ...params,
        fee: 1000,
      },
      from: account.addr,
      appIndex: D981_d552_testnet_app,
      appArgs: argsredeemMint1,
      foreignAssets: [D981],
    });

    const tx4 = makeApplicationNoOpTxnFromObject({
      suggestedParams: {
        ...params,
        fee: 1000,
      },
      from: account.addr,
      appIndex: D981_d552_testnet_app,
      appArgs: argsredeemMint2,
      foreignAssets: [D552],
    });

    const transactions = [tx0, tx1, tx2, tx3, tx4];
    assignGroupID(transactions);
    const signedTxs = transactions.map((t) => t.signTxn(account.sk));
    const { txId } = await algodClient.sendRawTransaction(signedTxs).do();
    console.log("transaction ID:", txId);
  } catch (error) {
    return console.log(error.message);
  }
}

mint();
