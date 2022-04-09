import { assetID, lTNano } from "./constants/constants.js";
import { getBurnQuote, getMintQuote, getSwapQuote } from "./helpers/getQuote.js";

//getMintQuote({assetID_amount:1000}).catch((err) => console.error(err.message));
//getBurnQuote(1000).catch((err) => console.error(err.message));
getSwapQuote({asset: lTNano, assetAmount: 100}).catch((err) => console.error(err.message));