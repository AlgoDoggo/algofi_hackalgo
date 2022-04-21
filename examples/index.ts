import { getBurnQuote, getMetaSwapQuote, getMetaZapQuote, getMintQuote, getSwapQuote } from "../index.js";
import { mint, swap, burn, metaswap, metazap } from "../index.js";
import { assetID, stable1, stable2 } from "../src/constants/constants.js";

const arg = process.argv[2];
const amount = 1000;
const assetToSwap = assetID;
const stableToMetaSwap = stable1;
const stableToMetaZap = stable2;

try {
  if (arg === "mint") {
    const { assetID_needed, nanoLT_needed } = await getMintQuote({ assetID_amount: amount });
    await mint({ optIn: false, assetID_amount: assetID_needed, nanoLT_amount: nanoLT_needed, maxSlippage: 1000000 });
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
    const { extraFeeMint, extraFeeSwap, toConvert } = await getMetaZapQuote({
      amountIn: amount,
      stableIn: stableToMetaZap,
    });
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
