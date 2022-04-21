import { bootstrapTeal } from "./branches/bootstrapTeal.js";
import { checkFeesTeal } from "./branches/checkFeesTeal.js";
import { mintTeal } from "./branches/mintTeal.js";
import { metaswapTeal } from "./branches/metaswapTeal.js";
import { metazapTeal } from "./branches/metazapTeal.js";
import { common_appl_fields } from "./subroutines/common_appl_fields.js";
import { burnTeal } from "./branches/burnTeal.js";
import { swapTeal } from "./branches/swapTeal.js";

interface App {
  ({}: {
    assetID: number;
    nanoLT: number;
    stable1: number;
    stable2: number;
    stable1Stable2AppId: number;
    stable1Stable2AppAddress: string;
    managerID_nanoswap: number;
  }): string;
}

export const appTeal : App = ({
  assetID,
  nanoLT,
  stable1,
  stable2,
  stable1Stable2AppId,
  stable1Stable2AppAddress,
  managerID_nanoswap,
}) => `
// scratch space :
// 1: Metapool Liquidity token ID
// 2: algo amount in the app
// 3: nanoLT asset amount in the app
// 21: issued amount of Metapool LT
// 27: assetID supply

// MetaSwap Specific:
// 4: nanoLT amount out for swap operation
// 5: ID of asset out, should be either stable1 or stable2
// 6: ID of asset in, should be either stable1 or stable 2. Once the burn is done, 
// this asset will be traded in against the other member of that pair.
// 7: amount sent back to user

// Metazap specific:
// 8: stable in ID for the swap
// 9: stable out ID for the swap
// 10: nanopool balance of stable-in
// 12: amount of stable-in to zap, sent by the user
// 13: amount of stable-in to exchange for the other stable coin so that we may get an appropriate ratio for minting
// 14: amount of stable-in to send to the nanoswap for the mint
// 15: amount of stable-out in the app account
// 16: actual amount of stable-in to send for minting
// 17: actual amount of stable-out to send for minting
// 18: nanoLT amount mint
// 19: final amount of assetID to send back

// CheckFees specific:
// 20: number of MinTxnFee consumed by the metapool

// Mint specific:
// 22: amount of Metapool LT to send
// 23: ID of asset that was sent in excess
// 24: assetID amount * issued Metapool LT / assetID supply
// 25: nanoLT amount * issued Metapool LT / nanoLT supply
// 26: redeem amount of asset that was sent in excess

// Burn specific:
// 29: assetID amount to send back
// 30: nanoLT amount to send back

// Swap specific:
// 31: ID of asset-in 
// 32: ID of asset-out
// 33: amount of asset-out

#pragma version 6

// We follow AlgoFi's convention and say that stable1 will be smaller than stable2
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

byte "Metapool LT"
app_global_get
store 1 // Metapool Liquidity token ID

global CurrentApplicationAddress
int ${nanoLT}
asset_holding_get AssetBalance // retrieve input supply amount in this case that's assetID
pop // is app opted-in nanoLT
store 3 // nanoLT supply in the app account

global CurrentApplicationAddress
int ${assetID}
asset_holding_get AssetBalance // liquidity token amount in the app
pop
store 27 // assetID supply

// Allow bootstrap
txna ApplicationArgs 0
byte "bootstrap"
==
load 1 // if pool is not bootstrapped load 1 will be 0
int 0
==
&&
global GroupSize
int 2
==
&&
bnz bootstrap

// Before we go any further let's verify the pool is bootstrapped
load 1 
assert

global CurrentApplicationAddress
balance
store 2 // algo amount in the app

// all the following branches have at most 3 tx
global GroupSize
int 3
<=
assert

txna ApplicationArgs 0
byte "metaswap" 
==
bnz metaswap

txna ApplicationArgs 0
byte "metazap" 
==
bnz metazap


// calculate the issued amount of Metapool LT, useful for mint and burn operations
int 0
~ // bitwise invert value of 0 is 2**64 - 1
global CurrentApplicationAddress
load 1
asset_holding_get AssetBalance // liquidity token amount in the app
pop
- // (2**64 - 1 ) - actual balance
store 21 // issued amount of Metapool LT

txna ApplicationArgs 0
byte "mint" 
==
bnz mint

// all the following branches have 2 tx
global GroupSize
int 2
==
assert

txna ApplicationArgs 0
byte "burn" 
==
bnz burn

txna ApplicationArgs 0
byte "swap" 
==
bnz swap


err


// branches

mint:
${mintTeal({ assetID, nanoLT })}

burn:
${burnTeal({ assetID, nanoLT })}

swap:
${swapTeal({ assetID, nanoLT })}

metaswap:
${metaswapTeal({ assetID, nanoLT, stable1, stable2, stable1Stable2AppId, stable1Stable2AppAddress, managerID_nanoswap })}

metazap:
${metazapTeal({ assetID, nanoLT, stable1, stable2, stable1Stable2AppId, stable1Stable2AppAddress, managerID_nanoswap })}

bootstrap:
${bootstrapTeal({ assetID, nanoLT, stable1, stable2 })}


//common subroutines

common_appl_fields:
${common_appl_fields}


// end of program

// Checking fees is necessary for metaswap and metazap only
checkFees: 
${checkFeesTeal}  

allow:
int 1

`;
