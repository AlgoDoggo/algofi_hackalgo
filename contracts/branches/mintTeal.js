export const mintTeal = ({ assetID, lTNano }) => `

// check the two assets sent are the right ones and going to the app
gtxn 1 XferAsset // by convention we'll send assetID first
int ${assetID}
==
gtxn 2 XferAsset
int ${lTNano}
==
&&
gtxn 1 AssetReceiver
global CurrentApplicationAddress
==
&&
gtxn 2 AssetReceiver
global CurrentApplicationAddress
==
&&
assert

load 21 // issued amount of Metapool LT
bz first_mint // if 0 LT issued then it's first mint


// if not first mint let's calculate the Metapool LT to send
// 	Metapool LT out = Math.min(
// 		assetID amount * issued Metapool LT / assetID supply,
// 		lTNano amount * issued Metapool LT / lTNano supply
// 	)

gtxn 1 AssetAmount
load 21
mulw
load 27 // assetID supply
divw // assetID amount * issued Metapool LT / assetID supply
dup // we're going to leave that value on stack
store 24 

gtxn 2 AssetAmount
load 21
mulw
load 28 // lTNano supply
divw // lTNano amount * issued Metapool LT / lTNano supply
dup
store 25 // lTNano amount * issued Metapool LT / lTNano supply
// second value on stack, let's just pick the smallest now
dup2
> // is first value bigger than second value ?
// let's keep that value on stack for now
// here I want to record wether it's assetID or ltNano that was supplied in excess amount
int ${assetID}
int ${lTNano}
dig 2 // copying the 0 or 1 from > comparison
int 0
==
select // if 0 it means lTNano was sent in excess amount else it's assetID
store 23 // asset that was sent in excess
select // now we're back at picking the smallest amount of the two
store 22 // amount of Metapool LT to send


// the excess token that was sent will need to returned to the user such as:
// Excess Metapool LT = Math.max(load 24, load 25) - (amount of Metapool LT to send ) - 1
// redeem amount = Excess Metapool LT * load 23 supply / Metapool LT issued

// what is the largest amount ?
load 24
load 25
dup2
<
select
load 22
- // Excess Metapool LT
// I'm substracting 1 here to avoid shenanigans with the way load 22 is calculated
// specifically how the remainder is left out of divisions and the load 22 value could be slightly lower
// than actual value which in turn could be an attack vector to redeem more than fair amount
// more research needed to confirm
int 1
dig 1 // Excess Metapool LT
int 0
==
select // if excess metapool LT is 0 substracting 1 would crash the program
int 1 
-

global CurrentApplicationAddress
load 23 // asset that was sent in excess
asset_holding_get AssetBalance // amount in the app
pop
mulw
load 21
divw
dup // let's leave one redeem amount on stack for later
store 26 // redeem amount

// now let's check we haven't exceeded max slippage
gtxn 1 AssetAmount
gtxn 2 AssetAmount
int ${lTNano}
load 23
==
select // pick the asset amount from the asset that was sent in excess
txna ApplicationArgs 1 // max slippage, for example 1 percent = int 10000
btoi
// dup // You can uncomment the following 4 lines if you want to set a hard ceiling on max slippage 
// int 10000 // here it would make for a max slippage of 1%
// <=
// assert
mulw // asset amount * max slippage
int 1000000
divw
<=
assert // redeem amount <= asset amount * max slippage


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

itxn_submit

// adding the following as a workaround current indexer limitation
// to retrieve issued metapool lt doing = 2**64-1 - current balance works in the smart contract
// but wouldn't work in the front-end since the indexer gives inaccurate values
// for very large numbers > 17 digits
byte "issued Metapool LT"
dup
app_global_get
load 22 // amount of Metapool LT to send
+
app_global_put

load 26 // is there any amount to redeem?
bz allow

// if so let's send it back

itxn_begin

int 0
itxn_field Fee
int axfer
itxn_field TypeEnum
load 23 // Metapool Liquidity token ID
itxn_field XferAsset
load 26 // amount of Metapool LT to send
itxn_field AssetAmount
txn Sender
itxn_field AssetReceiver

itxn_submit

b allow


`
