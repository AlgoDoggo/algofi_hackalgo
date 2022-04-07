export const swapTeal = ({ assetID, lTNano }) => `

// we can only swap assetID or lTNano
gtxn 1 XferAsset 
dup
int ${assetID}
==
int ${lTNano}
==
||
assert



`