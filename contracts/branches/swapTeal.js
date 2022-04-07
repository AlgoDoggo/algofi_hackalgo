export const swapTeal = ({ assetID, lTNano }) => `

// we can only swap assetID or lTNano
gtxn 1 XferAsset 
dup
dup
store 31 // store the id of asset in
int ${assetID}
==
int ${lTNano}
==
||
assert

// store the id of asset out
int ${assetID}
int ${lTNano}
load 31
int ${assetID}
==
select
store 32 // id of asset out

// check it's going to the app account
gtxn 1 AssetReceiver
global CurrentApplicationAddress
==
assert

//  amount_out = (asset_in_amount * 9975 * asset_out_supply) / ((asset_in_supply * 10000) + (asset_in_amount * 9975))

gtxn 1 AssetAmount
int 9975
* 
load 27 // assetID supply
load 28 // lTNano supply
int ${lTNano}
load 32
==
select
mulw // (asset_in_amount * 9975 * asset_out_supply)

load 27 // assetID supply
load 28 // lTNano supply
int ${lTNano}
load 31
==
select
int 10000
*
gtxn 1 AssetAmount
int 9975
*
addw // ((asset-in supply * 10000) + (asset-in amount * 9975))

divmodw
pop
pop
swap
pop
dup
store 33 // amount of asset-out to send

// let's check we got more than the min amount set in appArgs
txna ApplicationArgs 1
btoi
>=
assert

// let's send the swapped asset to the user

itxn_begin

int axfer
itxn_field TypeEnum
load 32 // ID of asset-out
itxn_field XferAsset
load 33 // amount of asset-out to send
itxn_field AssetAmount
txn Sender
itxn_field AssetReceiver
int 0
itxn_field Fee

itxn_submit

b allow

`