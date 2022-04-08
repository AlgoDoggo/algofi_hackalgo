export const bootstrapTeal = ({ assetID, lTNano, stable1, stable2 }) => `

// To bootstrap the pool we'll send it 1 Algo
// Let's verify those params

gtxn 0 TypeEnum
int pay
== 
assert

gtxn 0 Amount
int 1000000
==
assert

gtxn 0 Receiver
global CurrentApplicationAddress
==
assert

// The app will now opt-in all the relevant assets
// assetID, stable1, stable2 and their liquity token lTNano

itxn_begin

// optin-in stable2
int ${stable2}
itxn_field XferAsset
// the rest of fields are common to all inner bootstrap tx
callsub bootstrap_commonFields

// optin-in stable1
itxn_next

int ${stable1}
itxn_field XferAsset
callsub bootstrap_commonFields

// optin-in stable2-stable1 lTNano
itxn_next

int ${lTNano}
itxn_field XferAsset
callsub bootstrap_commonFields

// optin-in the token this pool is set for
itxn_next

int ${assetID}
itxn_field XferAsset
callsub bootstrap_commonFields

// send the opt-ins
itxn_submit


// create this metapool liquidity token
itxn_begin
int 0
itxn_field Fee
int acfg
itxn_field TypeEnum
int 0
~
itxn_field ConfigAssetTotal
int 6
itxn_field ConfigAssetDecimals
int 0
itxn_field ConfigAssetDefaultFrozen
byte "METAPOOL"
itxn_field ConfigAssetUnitName
byte "Metapool LT ${assetID}-${lTNano}"
itxn_field ConfigAssetName
byte "https://github.com/AlgoDoggo/algofi_hackalgo" 
itxn_field ConfigAssetURL

// send the tx and return
itxn_submit

// save Metapool Liquidity token ID in app global state
byte "Metapool LT"
itxn CreatedAssetID
app_global_put


b allow


////////////////////// subroutines

bootstrap_commonFields:

// opt-in is an asset transfer
int axfer
itxn_field TypeEnum

// transfer amount is 0 for opt-in
int 0
itxn_field AssetAmount

// Sender is the app
global CurrentApplicationAddress
itxn_field Sender

// Since the sender is the app, let's set the Fee to 0
int 0
itxn_field Fee

// Receiver is the app
global CurrentApplicationAddress
itxn_field AssetReceiver

retsub

`
