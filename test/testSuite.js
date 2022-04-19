import { assert } from "chai";
import { strict } from "assert";
import { assetID, nanoLT, stable1, stable2 } from "../src/constants/constants.js";
import burn from "../examples/burn.js";
import mint from "../examples/mint.js";
import metaswap from "../examples/metaswap.js";
import metazap from "../examples/metazap.js";
import swap from "../examples/swap.js";
import {
  fetchPoolStates,
  getBurnQuote,
  getMetaSwapQuote,
  getMetaZapQuote,
  getMintQuote,
  getSwapQuote,
} from "../src/getQuote.js";

describe("generalChecks", () => {
  it("stable1 < stable2", () => {
    assert.isBelow(stable1, stable2);
  });
});

describe("mintChecks", () => {
  it("handle 0 amount", async () => {
    await strict.rejects(mint({ optIn: false, assetID_amount: 0, nanoLT_amount: 2000, maxSlippage: 1000000 }));
    await strict.rejects(mint({ optIn: false, assetID_amount: 1000, nanoLT_amount: 0, maxSlippage: 1000000 }));
    await strict.rejects(mint({ optIn: false, assetID_amount: 1000, nanoLT_amount: 2000, maxSlippage: 0 }));
  });
  it("handle undefined amount", async () => {
    await strict.rejects(mint({ optIn: false, assetID_amount: undefined, nanoLT_amount: 2000, maxSlippage: 1000000 }));
    await strict.rejects(mint({ optIn: false, assetID_amount: 1000, nanoLT_amount: undefined, maxSlippage: 1000000 }));
    await strict.rejects(mint({ optIn: false, assetID_amount: 1000, nanoLT_amount: 2000, maxSlippage: undefined }));
  });
  it("handle null amount", async () => {
    await strict.rejects(mint({ optIn: false, assetID_amount: null, nanoLT_amount: 2000, maxSlippage: 1000000 }));
    await strict.rejects(mint({ optIn: false, assetID_amount: 1000, nanoLT_amount: null, maxSlippage: 1000000 }));
    await strict.rejects(mint({ optIn: false, assetID_amount: 1000, nanoLT_amount: 2000, maxSlippage: null }));
  });
  it("handle wrong types", async () => {
    await strict.rejects(mint({ assetID_amount: "hello", nanoLT_amount: 2000, maxSlippage: 1000000 }));
    await strict.rejects(mint({ assetID_amount: 1000, nanoLT_amount: "hello", maxSlippage: 1000000 }));
    await strict.rejects(mint({ assetID_amount: 1000, nanoLT_amount: 2000, maxSlippage: "hello" }));
    await strict.rejects(mint({ assetID_amount: { test: 5 }, nanoLT_amount: 2000, maxSlippage: 1000000 }));
    await strict.rejects(mint({ assetID_amount: 1000, nanoLT_amount: { test: 5 }, maxSlippage: 1000000 }));
    await strict.rejects(mint({ assetID_amount: 1000, nanoLT_amount: 2000, maxSlippage: { test: 5 } }));
    await strict.rejects(mint({ assetID_amount: [], nanoLT_amount: 2000, maxSlippage: 1000000 }));
    await strict.rejects(mint({ assetID_amount: 1000, nanoLT_amount: [], maxSlippage: 1000000 }));
    await strict.rejects(mint({ assetID_amount: 1000, nanoLT_amount: 2000, maxSlippage: [] }));
  });
  it("test max slippage protection", async () => {
    const assetID_amount = 100;
    const { assetID_needed, nanoLT_needed, expectedMintAmount } = await getMintQuote({ assetID_amount });
    await strict.rejects(mint({ assetID_amount: assetID_needed, nanoLT_amount: nanoLT_needed * 2, maxSlippage: 1 }));
  });
  it("test math for minting precise metapool LT", async () => {
    const assetID_amount = 1000;
    const { assetID_needed, nanoLT_needed, expectedMintAmount } = await getMintQuote({ assetID_amount });
    const { mintAmount } = await mint({
      assetID_amount: assetID_needed,
      nanoLT_amount: nanoLT_needed,
      maxSlippage: 1000,
    });
    assert.approximately(mintAmount, expectedMintAmount, 1);
  });
  it("test math for minting approximate metapool LT", async () => {
    const assetID_amount = 1000;
    const { assetSupply, nanoLTSupply, metapoolLTIssued } = await fetchPoolStates();
    const { assetID_needed, nanoLT_needed, expectedMintAmount } = await getMintQuote({ assetID_amount });
    const { mintAmount, redeemAmount } = await mint({
      assetID_amount: assetID_needed,
      nanoLT_amount: Math.floor(nanoLT_needed * 1.05),
      maxSlippage: 100000,
    });
    assert.approximately(mintAmount, expectedMintAmount, 1);
    // Excess Metapool LT = Math.max(load 24, load 25) - (amount of Metapool LT to send ) - 1
    // redeem amount = Excess Metapool LT * load 23 supply / Metapool LT issued
    const excess = Math.floor(
      Math.max(
        (assetID_needed * metapoolLTIssued) / assetSupply,
        (Math.floor(nanoLT_needed * 1.05) * metapoolLTIssued) / nanoLTSupply
      ) -
        mintAmount -
        1
    );
    const expectedRedeemAmount = (excess * nanoLTSupply) / metapoolLTIssued;
    assert.approximately(redeemAmount, expectedRedeemAmount, 1);
  });
});

describe("burnChecks", () => {
  it("handle 0 amount", async () => {
    await strict.rejects(burn({ burnAmount: 0 }));
  });
  it("handle undefined amount", async () => {
    await strict.rejects(burn({ burnAmount: undefined }));
  });
  it("handle null amount", async () => {
    await strict.rejects(burn({ burnAmount: null }));
  });
  it("handle wrong types", async () => {
    await strict.rejects(burn({ burnAmount: "hello" }));
    await strict.rejects(burn({ burnAmount: {} }));
    await strict.rejects(burn({ burnAmount: [] }));
  });
  it("test math for burning metapool LT", async () => {
    const burnAmount = 100;
    const { assetOut: expectedAssetOut, nanoLTOut: expectednanoLTOut } = await getBurnQuote(burnAmount);
    const { assetOut, nanoLTOut } = await burn({ burnAmount });
    assert.approximately(assetOut, expectedAssetOut, 1);
    assert.approximately(nanoLTOut, expectednanoLTOut, 1);
  });
});

describe("swapChecks", () => {
  it("handle 0 amount", async () => {
    await strict.rejects(swap({ amount: 0, asset: assetID, minAmountOut: 0 }));
  });
  it("handle undefined amount", async () => {
    await strict.rejects(swap({ amount: undefined, asset: assetID, minAmountOut: 1 }));
    await strict.rejects(swap({ amount: 100, asset: undefined, minAmountOut: 1 }));
    await strict.rejects(swap({ amount: 100, asset: assetID, minAmountOut: undefined }));
  });
  it("handle null amount", async () => {
    await strict.rejects(swap({ amount: null, asset: assetID, minAmountOut: 1 }));
    await strict.rejects(swap({ amount: 100, asset: null, minAmountOut: 1 }));
    await strict.rejects(swap({ amount: 100, asset: assetID, minAmountOut: null }));
  });
  it("handle wrong types params", async () => {
    await strict.rejects(swap({ amount: "hello", asset: assetID, minAmountOut: 1 }));
    await strict.rejects(swap({ amount: 100, asset: "hello", minAmountOut: 1 }));
    await strict.rejects(swap({ amount: 100, asset: assetID, minAmountOut: "hello" }));
    await strict.rejects(swap({ amount: { test: 5 }, asset: assetID, minAmountOut: 1 }));
    await strict.rejects(swap({ amount: 100, asset: { test: 5 }, minAmountOut: 1 }));
    await strict.rejects(swap({ amount: 100, asset: assetID, minAmountOut: { test: 5 } }));
    await strict.rejects(swap({ amount: [], asset: assetID, minAmountOut: 1 }));
    await strict.rejects(swap({ amount: 100, asset: [], minAmountOut: 1 }));
    await strict.rejects(swap({ amount: 100, asset: assetID, minAmountOut: [] }));
  });
  it("test slippage control", async () => {
    await strict.rejects(swap({ amount: 100, asset: assetID, minAmountOut: 2n ** 64n - 1n }));
  });
  it("test math for swapping asset for nanopool LT", async () => {
    const assetID_amount = 100;
    const asset_swapped = assetID;
    const { amountOut: expectedAmountOut, assetOut: expectedAssetOut } = await getSwapQuote({
      asset: asset_swapped,
      assetAmount: assetID_amount,
    });
    const { amountOut, assetOut } = await swap({ amount: assetID_amount, asset: asset_swapped, minAmountOut: 1 });
    assert.approximately(amountOut, expectedAmountOut, 1);
    strict.equal(assetOut, expectedAssetOut);
  });
  it("test math for swapping nanopool LT for asset", async () => {
    const assetID_amount = 100;
    const asset_swapped = nanoLT;
    const { amountOut: expectedAmountOut, assetOut: expectedAssetOut } = await getSwapQuote({
      asset: asset_swapped,
      assetAmount: assetID_amount,
    });
    const { amountOut, assetOut } = await swap({ amount: assetID_amount, asset: asset_swapped, minAmountOut: 1 });
    assert.approximately(amountOut, expectedAmountOut, 1);
    strict.equal(assetOut, expectedAssetOut);
  });
});

describe("metaswapChecks", () => {
  it("handle 0 amount", async () => {
    await strict.rejects(metaswap({ assetAmount: 0, stableID: stable1, stableMinReturn: 9 }));
  });
  it("handle undefined params", async () => {
    await strict.rejects(metaswap({ assetAmount: undefined, stableID: stable1, stableMinReturn: 9 }));
    await strict.rejects(metaswap({ assetAmount: 1000, stableID: undefined, stableMinReturn: 9 }));
    await strict.rejects(metaswap({ assetAmount: 1000, stableID: stable1, stableMinReturn: undefined }));
  });
  it("handle null params", async () => {
    await strict.rejects(metaswap({ assetAmount: null, stableID: stable1, stableMinReturn: 9 }));
    await strict.rejects(metaswap({ assetAmount: 1000, stableID: null, stableMinReturn: 9 }));
    await strict.rejects(metaswap({ assetAmount: 1000, stableID: stable1, stableMinReturn: null }));
  });
  it("handle wrong types params", async () => {
    await strict.rejects(metaswap({ assetAmount: "hello", stableID: stable1, stableMinReturn: 9 }));
    await strict.rejects(metaswap({ assetAmount: 1000, stableID: "hello", stableMinReturn: 9 }));
    await strict.rejects(metaswap({ assetAmount: 1000, stableID: stable1, stableMinReturn: "hello" }));
    await strict.rejects(metaswap({ assetAmount: { test: 5 }, stableID: stable1, stableMinReturn: 9 }));
    await strict.rejects(metaswap({ assetAmount: 1000, stableID: { test: 5 }, stableMinReturn: 9 }));
    await strict.rejects(metaswap({ assetAmount: 1000, stableID: stable1, stableMinReturn: { test: 5 } }));
    await strict.rejects(metaswap({ assetAmount: [], stableID: stable1, stableMinReturn: 9 }));
    await strict.rejects(metaswap({ assetAmount: 1000, stableID: [], stableMinReturn: 9 }));
    await strict.rejects(metaswap({ assetAmount: 1000, stableID: stable1, stableMinReturn: [] }));
  });
  it("test slippage control", async () => {
    await strict.rejects(metaswap({ assetAmount: 1000, stableID: stable1, stableMinReturn: 2n ** 64n - 1n }));
  });
  it("test math metaswap for stable1", async () => {
    const amountIn = 100;
    const stableOut = stable1;
    const { stableOutAmount: expectedStableOutAmount, extraFee: extraComputeFee } = await getMetaSwapQuote({
      amountIn,
      stableOut,
    });
    const { stableOutAmount } = await metaswap({
      assetAmount: amountIn,
      stableOut,
      extraComputeFee,
    });
    assert.approximately(stableOutAmount, expectedStableOutAmount, 2);
  });
  it("test math, metaswap for stable2", async () => {
    const amountIn = 100;
    const stableOut = stable2;
    const { stableOutAmount: expectedStableOutAmount, extraFee: extraComputeFee } = await getMetaSwapQuote({
      amountIn,
      stableOut,
    });
    const { stableOutAmount } = await metaswap({
      assetAmount: amountIn,
      stableOut,
      extraComputeFee,
    });
    assert.approximately(stableOutAmount, expectedStableOutAmount, 2);
  });
});

describe("metazapChecks", () => {
  it("handle 0 amount", async () => {
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: 0, minAssetToGet: 0 }));
  });
  it("handle undefined params", async () => {
    await strict.rejects(metazap({ stableToZap: undefined, zapAmount: 100, minAssetToGet: 0 }));
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: undefined, minAssetToGet: 0 }));
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: 100, minAssetToGet: undefined }));
  });
  it("handle null params", async () => {
    await strict.rejects(metazap({ stableToZap: null, zapAmount: 100, minAssetToGet: 0 }));
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: null, minAssetToGet: 0 }));
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: 100, minAssetToGet: null }));
  });
  it("handle wrong types params", async () => {
    await strict.rejects(metazap({ stableToZap: "hello", zapAmount: 100, minAssetToGet: 9 }));
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: "hello", minAssetToGet: 9 }));
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: 100, minAssetToGet: "hello" }));
    await strict.rejects(metazap({ stableToZap: { test: 5 }, zapAmount: 100, minAssetToGet: 9 }));
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: { test: 5 }, minAssetToGet: 9 }));
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: 100, minAssetToGet: { test: 5 } }));
    await strict.rejects(metazap({ stableToZap: [], zapAmount: 100, minAssetToGet: 9 }));
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: [], minAssetToGet: 9 }));
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: 100, minAssetToGet: [] }));
  });
  it("test slippage control", async () => {
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: 0, minAssetToGet: 2n ** 64n - 1n }));
  });
  it("test math for metazapping stable 1", async () => {
    const amountIn = 1000;
    const stableIn = stable1;
    const {
      amountOut: expectedAmountOut,
      toConvert,
      extraFeeMint,
      extraFeeSwap,
    } = await getMetaZapQuote({
      amountIn,
      stableIn,
    });
    const { assetOutAmount } = await metazap({
      stableToZap: stableIn,
      zapAmount: amountIn,
      toConvert,
      extraFeeSwap,
      extraFeeMint,
    });
    assert.approximately(assetOutAmount, expectedAmountOut, 2);
  });
  it("test math for metazapping stable 2", async () => {
    const amountIn = 1000;
    const stableIn = stable2;
    const {
      amountOut: expectedAmountOut,
      toConvert,
      extraFeeMint,
      extraFeeSwap,
    } = await getMetaZapQuote({
      amountIn,
      stableIn,
    });
    const { assetOutAmount } = await metazap({
      stableToZap: stableIn,
      zapAmount: amountIn,
      toConvert,
      extraFeeSwap,
      extraFeeMint,
    });
    assert.approximately(assetOutAmount, expectedAmountOut, 2);
  });
});
