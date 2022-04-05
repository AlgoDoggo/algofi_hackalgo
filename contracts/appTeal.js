import { bootstrapTeal } from "./components/bootstrapTeal.js";
import { swapTeal } from "./components/swapTeal.js";
import { zapTeal } from "./components/zapTeal.js";

export const appTeal = ({ assetID, lTNano, stable1, stable2 , stable1Stable2AppId, stable1Stable2AppAddress, managerID_nanoswap}) => `
// swap call front-end: 
// foreignApps:[stable1Stable2AppId, managerID_nanoswap]
// foreignAssets: [assetID, lTNano, stable1, stable2] stable1 < stable2
// accounts: [stable1Stable2AppAddress aka the Nanoswap pool]
// appArgs:["metaswap" || "metazap" etc, int minimumAmountOut,  assetOutID (stable1 or stable2): only for metaswap ]


// scratch space : {
// ////1: liquidity token ID for Nanoswap Pool aka lTNano
// 1: is app bootstrapped ?
// //// 2: assetID for which the metapool was created
// 3: lTNano asset amount in the app

// MetaSwap Specific:
// 4: lTNano amount out for swap operation
// 5: ID of asset out, should be either stable1 or stable2
// 6: ID of asset in, should be either stable1 or stable 2. Once the burn is done, 
// this asset will be traded in against the other member of that pair.
// 7: amount sent back to user

// Metazap specific:
// 8: stable in ID for the swap
// 9: stable out ID for the swap
// 10: nanoswap pool balance of stable-in
// 11: nanoswap pool balance of stable-out
// 12: amount of stable-in to zap, sent by the user
// 13: amount of stable-in to exchange for the other stable coin so that we may get an appropriate ratio for minting
// 14: amount of stable-in to send to the nanoswap for the mint
// 15: amount of stable-out in the app account
// 16: theoretical amount of stable-out to send for minting
// 17: actual amount of stable-out to send for minting
// 18: lTNano amount mint
// 19: final amount of assetID to send back
//}


#pragma version 6

// We follow AlgoFi's convention and say that asset1 will be smaller than asset2
int ${stable1}
int ${stable2}
<
assert

// Allow creation
txn ApplicationID
bz allow

// We're making this contract immutable
txn OnCompletion
int UpdateApplication
!=
txn OnCompletion
int DeleteApplication
!=
&&
txn OnCompletion
int CloseOut
!=
&&
assert

// This whole app works with 2 transactions
global GroupSize
int 2
==
assert

//byte "lTNano" // liquidity token ID for Nanoswap Pool
//app_global_get // will return 0 if pool is not bootstrapped
//store 1

global CurrentApplicationAddress
int ${lTNano}
asset_holding_get AssetBalance // retrieve input supply amount in this case that's assetID
store 1 // is app bootstrapped aka opted-in lTNano
store 3 // lTNano asset amount in the app account

// Allow bootstrap
txna ApplicationArgs 0
byte "bootstrap"
==
load 1 // if pool is not bootstrapped load 1 will be 0
int 0
==
&&
bnz bootstrap

// Allow Opt-in.
txn OnCompletion
int OptIn
==
bnz allow

// Before we go any further let's verify the pool is bootstrapped
load 1 
assert

txna ApplicationArgs 0
byte "metaswap" 
==
bnz metaswap

txna ApplicationArgs 0
byte "metazap" 
==
bnz metazap



err


metaswap:
${swapTeal({ assetID, lTNano, stable1, stable2 , stable1Stable2AppId, stable1Stable2AppAddress, managerID_nanoswap})}

metazap:
${zapTeal({ assetID, lTNano, stable1, stable2 , stable1Stable2AppId, stable1Stable2AppAddress, managerID_nanoswap})}

bootstrap:
${bootstrapTeal({ assetID, lTNano, stable1, stable2 })}


allow:
int 1

`