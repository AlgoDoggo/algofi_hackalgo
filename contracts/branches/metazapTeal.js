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
store 10 // balance of stable-in asset or s1

addr ${stable1Stable2AppAddress}
load 9
asset_holding_get AssetBalance
pop // remove opt-in info
store 11 // balance of stable-out asset or s2

// save the amount of stable-in to zap
// here I could use gtxn 1 AssetAmount but I chose to use the metapool asset balance rather. 
// else if somebody inadvertently sent any stable-in to our metapool it would be stuck forever.

global CurrentApplicationAddress
load 8 // stable-in ID
asset_holding_get AssetBalance 
pop // remove opt-in info
store 12

// To mint lTNano we must supply an appropriate ratio of stable1 and stable2 such as:
// stable1 sent / stable2 sent = stable1 supply / stable2 supply

// First let's convert stable-in into an appropriate amount of stable1-stable2 for the subsquent lTNano mint

// The math to figure out the amount of stable-in to convert is not the same whether we are interacting
// with a Nanopool or a normal Dex pool. We will do the calculation for the nanopool int he front-end and send the precise
// value in app args, and leave the calculus for a normal dex in the smart contract, as a backup in case
// no convert amount is set in app args

// check wether the front end is giving us the amount of stable-in to convert
txna ApplicationArgs 2
btoi
dup
store 13
bnz let_the_zappin_begin

// Math for zapping in a normal dex pool:
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

load 10 // s1
load 12
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
store 13 // stable-in amount to trade

// let's swap stable-in for stable-out

let_the_zappin_begin:

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
global MinTxnFee // fee pooling is not supported atm by algofi nanopool
itxn_field Fee

itxn_next

// second tx is the app call
int appl
itxn_field TypeEnum
global MinTxnFee
int 2 // appl fee is 2x min for nanoswap
txna ApplicationArgs 3 // we send extra fee in appargs 3
btoi
+
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
load 12 // what we had
load 13 // what we swapped
-
dup
store 14 // balance of stable-in asset
store 16 // amount of stable-in to send for minting

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
dup /// theoretical amount of stable-out to send for minting
store 17 // actual amount of stable-out to send for minting
load 15  // balance of stable-out asset
<= // make sure there is enought stable-out asset
bnz start_minting

// if there is not enough stable-out asset then let's reverse the math
// first the actual amount of stable-out to send is all we have
load 15
dup
store 17
// now let's figure out the amount of stable in to send
// stable-in amount to send = load 15 * s1 / s2
load 10
load 13
+
mulw
addr ${stable1Stable2AppAddress}
load 9
asset_holding_get AssetBalance // s2
pop // remove opt-in info
divw
store 16

// For minting on Algofi it's important to send first the smallest stable ID so stable 1
start_minting:
itxn_begin

// first tx we send stable1 to the pool
int axfer
itxn_field TypeEnum
int ${stable1} 
itxn_field XferAsset
load 17 // stable out amount to send
load 16 // stable in amount to send
load 8
int ${stable1}
== // is stable-in stable 1?
select
itxn_field AssetAmount
addr ${stable1Stable2AppAddress}
itxn_field AssetReceiver
global MinTxnFee
itxn_field Fee

itxn_next

// second tx we send the stable-in to the pool
int axfer
itxn_field TypeEnum
int ${stable2} // stable-out ID
itxn_field XferAsset
load 17 // stable out amount to send
load 16 // stable in amount to send
load 8
int ${stable2}
== // is stable-in stable 2?
select
itxn_field AssetAmount
addr ${stable1Stable2AppAddress}
itxn_field AssetReceiver
global MinTxnFee 
itxn_field Fee

itxn_next

// third tx is app call to mint lTNano
int appl
itxn_field TypeEnum
global MinTxnFee
int 3 // nanomint is at least 3x min fee 
txna ApplicationArgs 4 // we send extra mint fee in appargs 4
btoi
+
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
global MinTxnFee 
itxn_field Fee

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
global MinTxnFee 
itxn_field Fee

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

int ${assetID} 
itxn_field XferAsset
load 19 // assetID amount out
itxn_field AssetAmount
callsub common_zap_fields

itxn_next

// when we minted our lTNano with the nanoswap pool, Algofi had us redeem excess amounts of stable1 and stable2

load 8 // stable-in ID
itxn_field XferAsset
global CurrentApplicationAddress
load 8 // stable-in ID
asset_holding_get AssetBalance // get what's left in the metapool
pop // remove opt-in info
itxn_field AssetAmount
callsub common_zap_fields

itxn_next

// when we minted our lTNano with the nanoswap pool, Algofi had us redeem excess amounts of stable1 and stable2

load 9 // stable-in ID
itxn_field XferAsset
global CurrentApplicationAddress
load 9 // stable-in ID
asset_holding_get AssetBalance // get what's left in the metapool
pop // remove opt-in info
itxn_field AssetAmount
callsub common_zap_fields

itxn_submit

int 13 // number of MinTxnFee consumed by the metapool
txna ApplicationArgs 3 // extra swap fee
btoi
+
txna ApplicationArgs 4 // extra mint fee
btoi
+
store 20

b checkFees

/////////////////////subroutines

common_zap_fields:

int axfer
itxn_field TypeEnum
txn Sender
itxn_field AssetReceiver

retsub


`
