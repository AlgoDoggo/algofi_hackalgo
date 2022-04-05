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
load 2 // algo amount at the start of the app
global CurrentApplicationAddress
balance // algo amount at the end of the app
-
>=
assert

`
