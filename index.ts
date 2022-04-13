import { assetID, lTNano, stable1, stable2 } from "./constants/constants.js";
import { getBurnQuote, getMetaSwapQuote, getMetaZapQuote, getMintQuote, getSwapQuote } from "./helpers/getQuote.js";

//getMintQuote({ assetID_amount: 1000 }).catch((err) => console.error(err.message));
//getBurnQuote(1000).catch((err) => console.error(err.message));
//getSwapQuote({asset: assetID, assetAmount: 100}).catch((err) => console.error(err.message));
//getMetaSwapQuote({amountIn: 100, stableOut: stable2}).catch((err) => console.error(err.message));
getMetaZapQuote({amountIn: 1000, stableIn: stable1}).catch((err) => console.error(err.message));
