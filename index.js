import dotenv from "dotenv";
import makeDeposit from "./helpers/makeDeposit.js";
import swap from "./helpers/swap.js";
dotenv.config();

// Comment or uncomment the assetID depending on whether you want to deposit algo or asa
// The logic will of course fail if you do not have the relevant asa in your account
const depositParams = {
  amount: 20,
  //assetID: [54215619],
};

//makeDeposit(depositParams)
//swap()