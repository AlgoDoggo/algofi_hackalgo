export const appTeal = ({ assetID_testnet, LTNano, stable1, stable2 , Stable1Stable2AppId, Stable1Stable2AppAddress, managerID_nanoswap}) => `
// swap call front-end:
// foreignApps:[Stable1Stable2AppId, managerID_nanoswap]
// foreignAssets: [stable1,stable2] stable1 < stable2
// accounts: [Stable1Stable2AppAddress aka the Nanoswap pool]
// appArgs:["swap", int minimumAmountOut,  assetOutID (stable1 or stable2) ]


// scratch space : {
// 1: liquidity token ID for Nanoswap Pool aka LTNano
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

byte "LTNano" // liquidity token ID for Nanoswap Pool
app_global_get // will return 0 if pool is not bootstrapped
store 1

byte "assetID" // assetID for metapool
app_global_get // will return 0 if pool is not bootstrapped
store 2

global CurrentApplicationAddress
load 1
asset_holding_get AssetBalance
pop // pop the opt-in date
store 3 // LTNano asset amount in the app

// Allow bootstrap
txn OnCompletion
int OptIn
==
txna ApplicationArgs 0
byte "bootstrap"
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

// check that the first transaction is the asset we want to swap and corresponds to the one in the pool
gtxn 0 XferAsset
txna Assets 0
==
load 2
==
&&
assert

// check it's going to the app account
gtxn 0 AssetReceiver
global CurrentApplicationAddress
==
assert

//  calculated_amount_out = (asset_in_amount * 9975 * output_supply) / ((input_supply * 10000) + (asset_in_amount * 9975))

gtxn 0 AssetAmount // input amount
int 9975 // 0.25% fee
*
load 3 // output supply amount in this case that's LTNano
mulw // 128 bit value

global CurrentApplicationAddress
load 2
asset_holding_get AssetBalance // retrieve input supply amount in this case that's assetID
pop // pop the opt-in
int 10000
*
gtxn 0 AssetAmount // input amount
int 9975 // 0.25% fee
*
addw // ((input_supply * 10000) + (asset_in_amount * 9975))

divmodw // division with 128 bit value
pop // pop the remainder of the division
pop // pop the remainder of the division
swap // get rid of the high uint64
pop // so only low quotient remains on stack
dup
store 4 // LTNano amount out
dup
int 0
>
assert // check amount out is more than 0
load 3 // LTNano amount
<
assert // check amount out is less than LTNano amount

//let's call the nanoswap pools

itxn_begin

// first tx we send the LTNano token in the pool for burning
int axfer
itxn_field TypeEnum
load 1 // LTNano assetID
itxn_field XferAsset
int 0
itxn_field Fee
load 4 // LTNano amount out
itxn_field AssetAmount
//txna Accounts 1 // will fail if it is not the address of Stable1Stable2AppId
addr ${Stable1Stable2AppAddress}
itxn_field AssetReceiver

itxn_next

// second tx is an appcall to get usdc back
int appl
itxn_field TypeEnum
//global MinTxnFee
//int 2
//*
int 0
itxn_field Fee
//txna Applications 1
int ${Stable1Stable2AppId}
itxn_field ApplicationID
byte "ba1o"
itxn_field ApplicationArgs
//txna Assets 0
int ${stable1}
itxn_field Assets
int NoOp
itxn_field OnCompletion

itxn_next

// third tx is an appcall to get stable2 back
int appl
itxn_field TypeEnum
//global MinTxnFee
//int 2
//*
int 0
itxn_field Fee
//txna Applications 1
int ${Stable1Stable2AppId}
itxn_field ApplicationID
byte "ba2o"
itxn_field ApplicationArgs
//txna Assets 1
int ${stable2}
itxn_field Assets
int NoOp
itxn_field OnCompletion

itxn_submit

// Now that we have both usdc and stbl in our account let's swap one for the other

// check appargs2 is either usdc or stbl. AppArgs2 is the stableCoin we want out.
txna ApplicationArgs 2
btoi
dup
store 5
int ${stable1} // usdc
==
load 5 // asset out
int ${stable2} // stbl
==
|| 
assert

int ${stable1} // A
int ${stable2} // B
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
int 0
itxn_field Fee
global CurrentApplicationAddress
load 6
asset_holding_get AssetBalance // load 6 amount
pop
itxn_field AssetAmount
//txna Accounts 1 // will fail if it is not the address of Stable1Stable2AppId
addr ${Stable1Stable2AppAddress}
itxn_field AssetReceiver

itxn_next

// second tx is the app call
int appl
itxn_field TypeEnum
//global MinTxnFee
//int 2
//*
int 0
itxn_field Fee
//txna ApplicationArgs 1
int ${Stable1Stable2AppId}
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
int NoOp
itxn_field OnCompletion

itxn_submit

global CurrentApplicationAddress
load 5
asset_holding_get AssetBalance // check if we got more than the minimum set in the args
pop
dup
store 7 // amount we'll send back to the user
txna ApplicationArgs 2
btoi
>=
assert

// let's send that asset back to the user
itxn_begin

int axfer
itxn_field TypeEnum
load 5 // asset-in, Either stable1 or stable2
itxn_field XferAsset
int 0
itxn_field Fee
load 7
itxn_field AssetAmount
txn Sender
itxn_field AssetReceiver

itxn_submit
b allow



bootstrap:

// To bootstrap the pool we'll send it 1 Algo
// Let's verify those params

load 1 // if pool is not bootstrapped load 1 will be 0
! 
assert // making sure the pool hasn't been bootstrapped already

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
// STBL, USDC and its LTNano

itxn_begin

// optin-in STBL
int ${STBL}
itxn_field XferAsset

// the rest of fields are common to all inner bootstrap tx
callsub subroutine_bootstrap

// optin-in USDC
itxn_next
int ${USDC}
itxn_field XferAsset
callsub subroutine_bootstrap

// optin-in STBL-USDC LTNano
itxn_next
int ${LTNano}
itxn_field XferAsset
callsub subroutine_bootstrap

// optin-in the token this pool is set for
itxn_next
int ${assetID_testnet}
itxn_field XferAsset
callsub subroutine_bootstrap

// send the tx and return
itxn_submit

// save assetID and LTNano in app global state
byte "assetID"
int ${assetID_testnet}
app_global_put

byte "LTNano"
int ${LTNano}
app_global_put

b allow

subroutine_bootstrap:

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

//back to the main
retsub



allow:
int 1

`