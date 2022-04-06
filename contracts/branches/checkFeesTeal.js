export const checkFeesTeal = `

gtxn 0 TypeEnum
int pay
==
gtxn 0 Receiver
global CurrentApplicationAddress
==
&&
assert

gtxn 0 Amount
global MinTxnFee
load 20 // number of MinTxnFee consumed by the metapool
*
>=
assert

`
