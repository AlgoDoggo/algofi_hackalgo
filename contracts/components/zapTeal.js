export const zapTeal = ({ assetID, LTNano, stable1, stable2 , Stable1Stable2AppId, Stable1Stable2AppAddress, managerID_nanoswap}) => `
// check that the first transaction is the asset we want to zap and corresponds to either stable1 or stable2
gtxn 0 XferAsset
int ${stable1}
==
gtxn 0 XferAsset
int ${stable2}
==
||
assert

// check it's going to the app account
gtxn 0 AssetReceiver
global CurrentApplicationAddress
==
assert

// let's start zapping. First convert stable-in into an appropriate amount of stable1-stable2


`
