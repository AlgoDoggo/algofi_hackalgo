export const metazapTeal = ({ assetID, lTNano, stable1, stable2 , stable1Stable2AppId, stable1Stable2AppAddress, managerID_nanoswap}) => `
// check that the first transaction is the asset we want to zap and corresponds to either stable1 or stable2
gtxn 1 XferAsset
dup
store 8 // save stable-in ID
int ${stable1}
==
gtxn 1 XferAsset
int ${stable2}
==
||
assert

// the other stable coin is the stable-out
int ${stable1}
int ${stable2}
int ${stable1}
gtxn 1 XferAsset
==
select
store 9 // stable-out ID

// check it's going to the app account
gtxn 1 AssetReceiver
global CurrentApplicationAddress
==
assert

// retrieve the asset ratio of the nanoswap pool

addr ${stable1Stable2AppAddress}
load 8
asset_holding_get AssetBalance
pop // remove opt-in info
store 10 // balance of stable-in asset

addr ${stable1Stable2AppAddress}
load 9
asset_holding_get AssetBalance
pop // remove opt-in info
store 11 // balance of stable-out asset

// save the amount of stable-in to zap
// here I could use gtxn 1 AssetAmount but I chose to use the metapool asset balance rather. 
// else if somebody inadvertently sent any stable-in to our metapool it would be stuck forever.

global CurrentApplicationAddress
load 8 // stable-in ID
asset_holding_get AssetBalance 
pop // remove opt-in info
dup
dup
store 12


// let's start zapping.

// To mint lTNano we must supply an appropriate ratio of stable1 and stable2 such as:
// stable1 sent / stable2 sent = stable1 supply / stable2 supply

// First let's convert stable-in into an appropriate amount of stable1-stable2 for the subsquent lTNano mint
// The math to figure out the amount of stable-in to convert is the following:
// if x is the amount of stable-in to convert, y the amount of stable-out to get
// s1 the supply of stable-in, s2 the supply of stable-out
// These equations must be respected for the proper ratio of stable coins to be had before minting lTNano:

// y = s1 - s1 * s2 / (s1 + x) this is the equation of token we'll get out from the swap
// (load 12 - x) / y = (s1 + x) / (s2 - y) this is the correct ratio of stable1 stable2 we need after the swap

// There is two solutions to these equations
// x1 = -s1 - sqrt( s1* ( s1 + load 12)) and x2 = -s1 + sqrt( s1* ( s1 + load 12))
// x and load 12 being both positive numbers the only solution is
// x = -s1 + sqrt( s1* ( s1 + load 12))
// let's rewrite it and compensate for the 0.25% fee loss
// x = (sqrt( s1 * ( s1 + load 12)) - s1) * 10000 / 9975

load 10 // s1, load 12 still twice on the stack
+
itob // going for byteslice arithmetic to avoid overflow issues
load 10
itob 
b*
bsqrt
btoi // it's cheaper to do the following substraction with uints than with byte slice arithmetic (b-)
load 10
- // here we have x, not adjusted for the fee the nanopool is going to charge
int 10000 // = byte 0x2710 
mulw
int 9975 // = byte 0x26f7 
divw // x adjusted for 0.25% fee
- // still had a load 12 on stack so this is load 12 - x_adjusted
store 13 // stable-in amount to trade

// let's swap stable-in for stable-out

itxn_begin

// first tx we send the stable-in to the pool
int axfer
itxn_field TypeEnum
load 8 // stable-in ID
itxn_field XferAsset
load 13 // from our calculations
itxn_field AssetAmount
addr ${stable1Stable2AppAddress}
itxn_field AssetReceiver

itxn_next

// second tx is the app call
int appl
itxn_field TypeEnum
global MinTxnFee
int 6 // appl fee is 5x min for swap in nanoswap pools, sometimes 6x
*
itxn_field Fee
int ${stable1Stable2AppId}
itxn_field ApplicationID
byte "sef" // swap exact for
itxn_field ApplicationArgs
int 0 // here we just set 0 for the minimum out, we will check that value globally later on
itob 
itxn_field ApplicationArgs
load 9 // asset out
itxn_field Assets
int ${managerID_nanoswap}
itxn_field Applications
callsub common_appl_fields

itxn_submit

// now let's mint our lTNano

// first get the current balance of stable-in
global CurrentApplicationAddress
load 8 // stable-in ID
asset_holding_get AssetBalance
pop // remove opt-in info
store 14 // balance of stable-in asset

// then get the current balance of stable-out
global CurrentApplicationAddress
load 9 // stable-out ID
asset_holding_get AssetBalance
pop // remove opt-in info
store 15 // balance of stable-out asset to send for minting

// here an adversary could have sent stable out to the metapool to modify the stable 1 - stable 2 ratio
// and make all minting and therefore metazaps impossible
// the reason for this is algofi max slippage on minting is 1% or int 10000 (after scaling)
// let's prevent this by making sure the stable-out amount sent = load 14 * s2 / s1

// retrieve the asset ratio of the nanoswap pools:

load 14
addr ${stable1Stable2AppAddress}
load 9
asset_holding_get AssetBalance // s2
pop // remove opt-in info
mulw // load 14 * s2
load 10 // balance of stable-in asset
load 13 // amount we swapped earlier
+ // s1 is the balance in nanopool before the swap + the amount we swapped in
divw // A,B / C. Fail if C == 0 or if result overflows. A,B as uint128
dup
store 16 // that's the correct amount of stable-out to send for minting
load 15 
dup2
>= // load 16 should be greater or equal than load 15 the asset balance
select // if true select load 15 else load 16
store 17


// For minting on Algofi it's important to send first the smallest stable ID so stable 1

itxn_begin

// first tx we send the stable-in to the pool
int axfer
itxn_field TypeEnum
int ${stable1} // stable-in ID
itxn_field XferAsset
load 17 // stable out amount to send
load 14 // stable in amount to send
load 8
int ${stable1}
== // is stable-in stable 1?
select
itxn_field AssetAmount
addr ${stable1Stable2AppAddress}
itxn_field AssetReceiver

itxn_next

// second tx we send the stable-in to the pool
int axfer
itxn_field TypeEnum
int ${stable2} // stable-out ID
itxn_field XferAsset
load 17 // stable out amount to send
load 14 // stable in amount to send
load 8
int ${stable2}
== // is stable-in stable 2?
select
itxn_field AssetAmount
addr ${stable1Stable2AppAddress}
itxn_field AssetReceiver

itxn_next

// third tx is app call to mint lTNano
int appl
itxn_field TypeEnum
global MinTxnFee
int 3 // for a swap in a nanoswap pool fee is 5x the min
*
itxn_field Fee
int ${stable1Stable2AppId}
itxn_field ApplicationID
byte "p" // "p" as pooling
itxn_field ApplicationArgs
// max slippage allowed by algofi pool, we'll check the metazap value against our user expectation at the end
int 10000 // 1%
itob 
itxn_field ApplicationArgs
int ${lTNano} // lTNano id
itxn_field Assets
int ${managerID_nanoswap}
itxn_field Applications
callsub common_appl_fields

itxn_next

// 4th tx is app call to redeem excess stable1
int appl
itxn_field TypeEnum
int ${stable1Stable2AppId}
itxn_field ApplicationID
byte "rpa1r" // algofi's string for redeeming after a mint
itxn_field ApplicationArgs
int ${stable1} 
itxn_field Assets
callsub common_appl_fields

itxn_next

// 5th tx is app call to redeem excess stable2
int appl
itxn_field TypeEnum
int ${stable1Stable2AppId}
itxn_field ApplicationID
byte "rpa2r"
itxn_field ApplicationArgs
int ${stable2} 
itxn_field Assets
callsub common_appl_fields

itxn_submit

// now let's calculate how much our freshly minted lTNano is worth in assetID
// how much lTNano did we mint?

global CurrentApplicationAddress
int ${lTNano}
asset_holding_get AssetBalance // retrieve input supply amount in this case that's assetID
pop // pop the opt-in
load 3 // that's the amount the app had before the mint
- // lTNano after mint - lTNano before mint
dup
store 18

//  calculated_amount_out = (asset_in_amount * 9975 * output_supply) / ((input_supply * 10000) + (asset_in_amount * 9975))
int 9975 // 0.25% fee
*
global CurrentApplicationAddress
int ${assetID}
asset_holding_get AssetBalance // retrieve output supply amount in this case that's assetID
pop // pop the opt-in
mulw // (asset_in_amount * 9975 * output_supply) 128 bit value

load 3 // lTNano amount before mint
int 10000
*
load 18 // lTNano amount we got from minting
int 9975 // 0.25% fee
*
addw // ((input_supply * 10000) + (asset_in_amount * 9975))

divmodw // division with 128 bit value
pop // pop the remainder of the division
pop // pop the remainder of the division
swap // get rid of the high uint64
pop // so only low quotient remains on stack
dup
store 19 // assetID amount out

// finally we check if we got more assetID than the minimum amount set in appargs 1
txna ApplicationArgs 1
btoi
>=
assert

// let's send this back to the user

itxn_begin

int axfer
itxn_field TypeEnum
int ${assetID} 
itxn_field XferAsset
load 19 // assetID amount out
itxn_field AssetAmount
txn Sender
itxn_field AssetReceiver

itxn_next

// when we minted our lTNano with the nanoswap pool, Algofi had us redeem excess amounts of stable1 and stable2
// The way we've calculated ratios, this redeem should always be stable-in asset since the stable-out amount sent should always
// be slightly smaller or equal than the proper ratio


int axfer
itxn_field TypeEnum
load 8 // stable-in ID
itxn_field XferAsset
global CurrentApplicationAddress
load 8 // stable-in ID
asset_holding_get AssetBalance // get what's left in the metapool
pop // remove opt-in info
itxn_field AssetAmount
txn Sender
itxn_field AssetReceiver

itxn_submit

int 11 // number of MinTxnFee consumed by the metapool
store 20

b checkFees

`
