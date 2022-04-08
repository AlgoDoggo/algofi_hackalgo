import { assert } from "chai";
import { strict } from "assert";
import { assetID, stable1, stable2 } from "../constants/constants.js";
import burn from "../examples/burn.js";
import mint from "../examples/mint.js";
import metaswap from "../examples/metaswap.js";
import metazap from "../examples/metazap.js";
import swap from "../examples/swap.js";

describe("generalChecks", () => {
  it("stable1 < stable2", () => {
    assert.isBelow(stable1, stable2);
  });
});

describe("mintChecks", () => {
  it("handle 0 amount", async () => {
    await strict.rejects(mint({ optIn: false, assetID_amount: 0, LTNano_amount: 2000, maxSlippage: 1000000 }));
    await strict.rejects(mint({ optIn: false, assetID_amount: 1000, LTNano_amount: 0, maxSlippage: 1000000 }));
    await strict.rejects(mint({ optIn: false, assetID_amount: 1000, LTNano_amount: 2000, maxSlippage: 0 }));
  });
  it("handle undefined amount", async () => {
    await strict.rejects(mint({ optIn: false, assetID_amount: undefined, LTNano_amount: 2000, maxSlippage: 1000000 }));
    await strict.rejects(mint({ optIn: false, assetID_amount: 1000, LTNano_amount: undefined, maxSlippage: 1000000 }));
    await strict.rejects(mint({ optIn: false, assetID_amount: 1000, LTNano_amount: 2000, maxSlippage: undefined }));
  });
  it("handle null amount", async () => {
    await strict.rejects(mint({ optIn: false, assetID_amount: null, LTNano_amount: 2000, maxSlippage: 1000000 }));
    await strict.rejects(mint({ optIn: false, assetID_amount: 1000, LTNano_amount: null, maxSlippage: 1000000 }));
    await strict.rejects(mint({ optIn: false, assetID_amount: 1000, LTNano_amount: 2000, maxSlippage: null }));
  });
  it("handle wrong types amount", async () => {
    await strict.rejects(mint({ assetID_amount: "hello", LTNano_amount: 2000, maxSlippage: 1000000 }));
    await strict.rejects(mint({ assetID_amount: 1000, LTNano_amount: "hello", maxSlippage: 1000000 }));
    await strict.rejects(mint({ assetID_amount: 1000, LTNano_amount: 2000, maxSlippage: "hello" }));
    await strict.rejects(mint({ assetID_amount: { test: 5 }, LTNano_amount: 2000, maxSlippage: 1000000 }));
    await strict.rejects(mint({ assetID_amount: 1000, LTNano_amount: { test: 5 }, maxSlippage: 1000000 }));
    await strict.rejects(mint({ assetID_amount: 1000, LTNano_amount: 2000, maxSlippage: { test: 5 } }));
    await strict.rejects(mint({ assetID_amount: [], LTNano_amount: 2000, maxSlippage: 1000000 }));
    await strict.rejects(mint({ assetID_amount: 1000, LTNano_amount: [], maxSlippage: 1000000 }));
    await strict.rejects(mint({ assetID_amount: 1000, LTNano_amount: 2000, maxSlippage: [] }));
  });
  it("test max slippage protection", async () => {
    await strict.rejects(mint({ assetID_amount: 1000, LTNano_amount: 2000, maxSlippage: 1 }));
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
  it("handle wrong types amount", async () => {
    await strict.rejects(burn({ burnAmount: "hello" }));
    await strict.rejects(burn({ burnAmount: {} }));
    await strict.rejects(burn({ burnAmount: [] }));
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
    await strict.rejects(metaswap({ assetAmount: 1000, stableID: stable1, stableMinReturn: BigInt(2n ** 64n - 1n) }));
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
    await strict.rejects(metazap({ stableToZap: stable1, zapAmount: 0, minAssetToGet: BigInt(2n ** 64n - 1n) }));
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
  it("handle wrong types amount", async () => {
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
    await strict.rejects(swap({ amount: 100, asset: assetID, minAmountOut: BigInt(2n ** 64n - 1n) }));
  });
});
