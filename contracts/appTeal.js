import { bootstrapTeal } from "./components/bootstrapTeal.js";
import { swapTeal } from "./components/swapTeal.js";

export const appTeal = ({ assetID, LTNano, stable1, stable2 , Stable1Stable2AppId, Stable1Stable2AppAddress, managerID_nanoswap}) => `
// swap call front-end:
// foreignApps:[Stable1Stable2AppId, managerID_nanoswap]
// foreignAssets: [assetID, LTNano, stable1, stable2] stable1 < stable2
// accounts: [Stable1Stable2AppAddress aka the Nanoswap pool]
// appArgs:["swap", int minimumAmountOut,  assetOutID (stable1 or stable2) ]


// scratch space : {
// ////1: liquidity token ID for Nanoswap Pool aka LTNano
// 1: is app bootstrapped ?
// 2: assetID for which the metapool was created
// 3: LTNano asset amount in the app
// Swap Specific:
// 4: LTNano amount out for swap operation
// 5: ID of asset out, should be either stable1 or stable2
// 6: ID of asset in, should be either stable1 or stable 2. Once the burn is done, 
// this asset will be traded in against the other member of that pair.
//}


#pragma version 6
// 658337286: STBL-USCD LTNano

// We follow AlgoFi's convention and say that asset1 will be smaller than asset2
int ${stable1}
int ${stable2}
<
assert

// Allow creation
txn ApplicationID
bz allow

// Since the contract involves a "sensitive" RekeyTo transaction we're making it immutable
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

//byte "LTNano" // liquidity token ID for Nanoswap Pool
//app_global_get // will return 0 if pool is not bootstrapped
//store 1

global CurrentApplicationAddress
int ${LTNano}
asset_holding_get AssetBalance // retrieve input supply amount in this case that's assetID
store 1 // is app bootstrapped aka opted-in LTNano
store 3 // LTNano asset amount in the app account

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
assert // does liquidity tokenID exist in global state?

txna ApplicationArgs 0
byte "swap" 
==
bnz swap



err


swap:
${swapTeal({ assetID, LTNano, stable1, stable2 , Stable1Stable2AppId, Stable1Stable2AppAddress, managerID_nanoswap})}

bootstrap:
${bootstrapTeal({ assetID, LTNano, stable1, stable2 })}


allow:
int 1

`