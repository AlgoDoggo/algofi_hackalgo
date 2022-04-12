export const burnTeal = ({ assetID, lTNano }) => `

// check the asset sent is the Metapool LT
gtxn 1 XferAsset // by convention we'll send assetID first
load 1
==
gtxn 1 AssetReceiver
global CurrentApplicationAddress
==
&&
assert

// assetID out = assetID supply * burn amount / issued amount of Metapool LT
// lTNano out = lTNano supply * burn amount / issued amount of Metapool LT

load 27
gtxn 1 AssetAmount
mulw
load 21
divw
store 29 // assetID amount to send back

load 3
gtxn 1 AssetAmount
mulw
load 21
divw
store 30 // lTNano amount to send back

// let's send back those amounts to the user
itxn_begin

int ${assetID}
itxn_field XferAsset
load 29 // amount of Metapool LT to send
itxn_field AssetAmount
callsub burn_commonFields

itxn_next

int ${lTNano}
itxn_field XferAsset
load 30 // amount of Metapool LT to send
itxn_field AssetAmount
callsub burn_commonFields

itxn_submit

// update global state
byte "issued Metapool LT"
dup
app_global_get
gtxn 1 AssetAmount // amount of Metapool LT burned
-
app_global_put

b allow


////////////////////// subroutines

burn_commonFields:

int axfer
itxn_field TypeEnum
txn Sender
itxn_field AssetReceiver
int 0
itxn_field Fee
retsub

`
