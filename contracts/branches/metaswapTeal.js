export const metaswapTeal = ({ assetID, lTNano, stable1, stable2 , stable1Stable2AppId, stable1Stable2AppAddress, managerID_nanoswap}) => `

// check that the first transaction is the asset we want to swap and corresponds to the one in the pool
gtxn 1 XferAsset 
int ${assetID}
==
assert

// check it's going to the app account
gtxn 1 AssetReceiver
global CurrentApplicationAddress
==
assert

//  calculated_amount_out = (assetID amount * 9975 * lTNano supply) / ((assetID supply * 10000) + (assetID amount * 9975))

gtxn 1 AssetAmount 
int 9975 // 0.25% fee
*
load 3 // lTNano supply
mulw // 128 bit value

global CurrentApplicationAddress
int ${assetID}
asset_holding_get AssetBalance // assetID supply
pop // pop the opt-in
int 10000
*
gtxn 1 AssetAmount // input amount
int 9975 // 0.25% fee
*
addw // ((assetID supply * 10000) + (assetID amount * 9975))

divmodw // division with 128 bit value
pop // pop the remainder of the division
pop // pop the remainder of the division
swap // get rid of the high uint64
pop // so only low quotient remains on stack
dup
store 4 // lTNano amount out
dup
int 0
>
assert // check amount out is more than 0
load 3 // lTNano amount
<
assert // check amount out is less than lTNano amount

//let's call the nanoswap pools

itxn_begin

// first tx we send the lTNano token in the pool for burning
int axfer
itxn_field TypeEnum
int ${lTNano} // lTNano assetID
itxn_field XferAsset
load 4 // lTNano amount out
itxn_field AssetAmount
addr ${stable1Stable2AppAddress}
itxn_field AssetReceiver

itxn_next

// second tx is an appcall to get stable1 back
int appl
itxn_field TypeEnum
global MinTxnFee
int 2 // appl fee is 2x min for burn in nanoswap pools
*
itxn_field Fee
int ${stable1Stable2AppId}
itxn_field ApplicationID
byte "ba1o"
itxn_field ApplicationArgs
int ${stable1}
itxn_field Assets
callsub common_appl_fields

itxn_next

// third tx is an appcall to get stable2 back
int appl
itxn_field TypeEnum
global MinTxnFee
int 2
* // appl fee is 2x min for burn in nanoswap pools
itxn_field Fee
int ${stable1Stable2AppId}
itxn_field ApplicationID
byte "ba2o"
itxn_field ApplicationArgs
int ${stable2}
itxn_field Assets
callsub common_appl_fields

itxn_submit

// Now that we have both stable1 and stable2 in our account let's swap one for the other

// check appargs2 is either stable1 or stable2. AppArgs2 is the stableCoin we want out.
txna ApplicationArgs 2
btoi
dup
store 5
int ${stable1} // D981
==
load 5 // asset out
int ${stable2} // D552
==
|| 
assert

int ${stable1} 
int ${stable2} 
int ${stable1}
load 5
== // is assetOut stable1 ?
select // If so select stable 2 else select stable1
store 6 // assetIn

// let's start the swap

itxn_begin

// first tx we send the asset1 token in the pool
int axfer
itxn_field TypeEnum
load 6 // asset-in, Either stable1 or stable2
itxn_field XferAsset
global CurrentApplicationAddress
load 6
asset_holding_get AssetBalance // load 6 amount
pop
itxn_field AssetAmount
addr ${stable1Stable2AppAddress}
itxn_field AssetReceiver

itxn_next

// second tx is the app call
int appl
itxn_field TypeEnum
global MinTxnFee
int 5 // for a swap in a nanoswap pool fee is at least 5x the min
*
itxn_field Fee
int ${stable1Stable2AppId}
itxn_field ApplicationID
byte "sef" // swap exact for
itxn_field ApplicationArgs
//When using itxn_field to set an array field (ApplicationArgs Accounts, Assets, or Applications) 
//each use adds an element to the end of the the array.
int 0 // here we just set 0 for the minimum out, we will check that value globally later on
itob 
itxn_field ApplicationArgs
load 5 // asset out
itxn_field Assets
int ${managerID_nanoswap}
itxn_field Applications
callsub common_appl_fields

itxn_submit

// finally we check if we got more than the minimum amount set in appargs 1
global CurrentApplicationAddress
load 5
asset_holding_get AssetBalance
pop // remove opt-in info
dup
store 7 // amount we'll send back to the user
txna ApplicationArgs 1
btoi
>=
assert

// let's send that asset back to the user
itxn_begin

int axfer
itxn_field TypeEnum
load 5 // asset-in, Either stable1 or stable2
itxn_field XferAsset
load 7
itxn_field AssetAmount
txn Sender
itxn_field AssetReceiver

itxn_submit

int 11 // number of MinTxnFee consumed by the metapool
store 20

b checkFees

`
