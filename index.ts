import { assetID, lTNano, stable1, stable2 } from "./src/constants/constants.js";
import burn from "./examples/burn.js";
import metaswap from "./examples/metaswap.js";
import metazap from "./examples/metazap.js";
import mint from "./examples/mint.js";
import swap from "./examples/swap.js";
import { getBurnQuote, getMetaSwapQuote, getMetaZapQuote, getMintQuote, getSwapQuote } from "./src/helpers/getQuote.js";

const arg = process.argv[2];
const amount = 1000;
const assetToSwap = assetID
const stableToMetaSwap = stable1
const stableToMetaZap = stable2

try {
  if (arg === "mint") {
    const { assetID_needed, lTNano_needed } = await getMintQuote({ assetID_amount: amount });
    await mint({ optIn: false, assetID_amount: assetID_needed, lTNano_amount: lTNano_needed, maxSlippage: 1000000 });
  }

  if (arg === "swap") {
    await getSwapQuote({ asset: assetToSwap, assetAmount: amount });
    await swap({ amount, asset: assetToSwap, minAmountOut: 1 });
  }

  if (arg === "burn") {
    await getBurnQuote(amount);
    await burn({ burnAmount: amount });
  }

  if (arg === "metaswap") {
    const { extraFee } = await getMetaSwapQuote({ amountIn: amount, stableOut: stableToMetaSwap });
    await metaswap({ assetAmount: amount, stableOut: stableToMetaSwap, stableMinReturn: 0, extraComputeFee: extraFee });
  }

  if (arg === "metazap") {
    const { extraFeeMint, extraFeeSwap, toConvert } = await getMetaZapQuote({ amountIn: 1000, stableIn: stableToMetaZap });
    await metazap({
      stableToZap: stableToMetaZap,
      zapAmount: amount,
      minAssetToGet: 0,
      toConvert,
      extraFeeSwap,
      extraFeeMint,
    });
  }
} catch (error) {
  console.log(error.message);
}
