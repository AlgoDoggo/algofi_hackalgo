export const appTeal = ({ assetID_testnet, STBL , USDC, LTNano}) => `
// scratch space : {
// 1: liquidity token ID for Nanoswap Pool aka LTNano
// 2: assetID for metapool
// 3: LTNano asset amount in the app
// 4: LTNano amount out for swap operation
//}


#pragma version 6
// 658337286: STBL-USCD LTNano

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

byte "assetID" // liquidity token ID for Nanoswap Pool
app_global_get // will return 0 if pool is not bootstrapped
store 2

global CurrentApplicationAddress
load 1
asset_holding_get AssetBalance
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

txna ApplicationArgs 0
byte "swap" 
==
bnz swap

// Allow Opt-in.
txn OnCompletion
int OptIn
==
bnz allow





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


int 1
return

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