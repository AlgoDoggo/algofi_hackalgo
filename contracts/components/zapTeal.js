export const zapTeal = ({ assetID, LTNano, stable1, stable2 , Stable1Stable2AppId, Stable1Stable2AppAddress, managerID_nanoswap}) => `
// check that the first transaction is the asset we want to zap and corresponds to either stable1 or stable2
gtxn 0 XferAsset
dup
store 8 // save stable-in ID
int ${stable1}
==
gtxn 0 XferAsset
int ${stable2}
==
||
assert

// the other stable coin is the stable-out
int ${stable1}
int ${stable2}
int ${stable1}
gtxn 0 XferAsset
==
select
store 9 // stable-out ID

// check it's going to the app account
gtxn 0 AssetReceiver
global CurrentApplicationAddress
==
assert

// retrieve the asset ratio of the nanoswap pool

addr ${Stable1Stable2AppAddress}
load 8
asset_holding_get AssetBalance
pop // remove opt-in info
store 10 // balance of stable-in asset

addr ${Stable1Stable2AppAddress}
load 9
asset_holding_get AssetBalance
pop // remove opt-in info
store 11 // balance of stable-out asset

// save the amount of stable-in to zap
gtxn 0 AssetAmount
store 12


// let's start zapping.

// To mint LTnano we must supply an appropriate ratio of stable1 and stable2 such as:
// stable1 sent / stable1 sent = stable1 supply / stable2 supply

// First let's convert stable-in into an appropriate amount of stable1-stable2 for the subsquent LTNano mint
// The math to figure out the amount of stable-in to convert was a little more complicated than thought
// I have excluded protocol fee calculation to simplify
// if x is the amount of stable-in to convert, y the amount of stable-out to get
// s1 the supply of stable-in, s2 the supply of stable-out
// These equations must be respected for the proper ratio of stable coins to be had before minting LTNano:

// y = s1 - s1*s2 / (s1+x) this is the equation of token we'll get out from the swap
// (load 12 - x) / y = (s1 + x) / (s2 - y) this is the correct ratio of stable1 stable2 we need after the swap

// There is two solutions to these equations
// x1 = -s1 - sqrt( s1* ( s1 + load 12)) and x2 = -s1 + sqrt( s1* ( s1 + load 12))
// x and load 12 being both positive numbers the only solution is
// x = -s1 + sqrt( s1* ( s1 + load 12))
// 	)





`
