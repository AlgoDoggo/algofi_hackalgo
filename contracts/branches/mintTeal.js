export const mintTeal = ({ assetID, lTNano, stable1, stable2 , stable1Stable2AppId, stable1Stable2AppAddress, managerID_nanoswap}) => `
// check the two assets sent are the right ones
gtxn 1 XferAsset // by convention we'll send assetID first
int ${assetID}
==
gtxn 2 XferAsset
int ${lTNano}
==
&&
assert

// calculate the issued amount of Metapool LT
int 0
~ // bitwise invert value of 0 is 2**64 - 1
global CurrentApplicationAddress
load 1
asset_holding_get AssetBalance // liquidity token amount in the app
pop
- // (2**64 - 1 ) - actual balance
dup
store 21 // issued amount of Metapool LT

bz first_mint // if 0 LT issued then it's first mint


// if not first mint let's calculate the Metapool LT to send
// 	Metapool LT out = Math.min(
// 		assetID amount * issued Metapool LT / assetID supply,
// 		lTNano amount * issued Metapool LT / lTNano supply
// 	)

gtxn 1 AssetAmount
load 21
mulw
global CurrentApplicationAddress
int ${assetID}
asset_holding_get AssetBalance // liquidity token amount in the app
pop
divw // assetID amount * issued Metapool LT / assetID supply
// we're going to leave that value on stack

gtxn 2 AssetAmount
load 21
mulw
global CurrentApplicationAddress
int ${lTNano}
asset_holding_get AssetBalance // liquidity token amount in the app
pop
divw // lTNano amount * issued Metapool LT / lTNano supply
// second value on stack, let's just pick the smallest
dup2
> // is first value bigger than second value ?
dup // here I want to record wether it's assetID or ltNano that was supplied in excess amount
int 0
==
select // if yes pick second value else first value
store 22 // amount of Metapool LT to send

b send_Metapool_LT


first_mint:
// minted_liquidity_token = sqrt(asset1_amount * asset2_amount)
// let's do byte arithemtic to avoid overflow issues
gtxn 1 AssetAmount
itob
gtxn 2 AssetAmount
itob
b*
bsqrt
btoi
store 22 // amount of Metapool LT to send


send_Metapool_LT:

// it will fail if the user has not opted-in the Metapool LT, it needs to be dealt with in the front-end

itxn_begin

int axfer
itxn_field TypeEnum
load 1 // Metapool Liquidity token ID
itxn_field XferAsset
load 22 // amount of Metapool LT to send
itxn_field AssetAmount
txn Sender
itxn_field AssetReceiver
int 0
itxn_field Fee

// let's send back the user the extra tokens in case he sent too much of one or the other

itxn_next

int 0
itxn_field Fee
int axfer
itxn_field TypeEnum
load 1 // Metapool Liquidity token ID
itxn_field XferAsset
load 22 // amount of Metapool LT to send
itxn_field AssetAmount
txn Sender
itxn_field AssetReceiver
int 0
itxn_field Fee

`
