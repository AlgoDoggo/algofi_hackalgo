import { getApplicationAddress } from "algosdk";

// TESTNET

// pool apps
export const stable1_stable2_app = 77282939; // D981-D552 nanopool
export const metapool_app = 83226655;

// algofi manager apps
export const managerID_dex = 66008735;
export const managerID_nanoswap = 77282916;

//assets
export const assetID = 54215619; // This is the token for which the metapool is created
export const lTNano = 77282957; // This is the stablecoins nanopool liquidity tokens
export const stable1 = 77279127; // D981
export const stable2 = 77279142; // D552
export const metapoolLT = 83226702; // This is the liquidity token of the metapool

//addresses
export const metapool_address = getApplicationAddress(metapool_app)
export const nanopool_address = getApplicationAddress(stable1_stable2_app)
