import { assetID, lTNano, stable1 } from "./constants/constants.js";
import { getBurnQuote, getMetaSwapQuote, getMintQuote, getSwapQuote } from "./helpers/getQuote.js";

getMintQuote({assetID_amount:1000}).catch((err) => console.error(err.message));
//getBurnQuote(1000).catch((err) => console.error(err.message));
//getSwapQuote({asset: lTNano, assetAmount: 100}).catch((err) => console.error(err.message));
//getMetaSwapQuote({amountIn: 100, stableOut: stable1}).catch((err) => console.error(err.message));