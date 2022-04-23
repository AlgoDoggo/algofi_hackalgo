import algosdk from "algosdk";

export function setupClient() {
  const token = "";
  //const server = "https://node.algoexplorerapi.io/";
  const server = "https://node.testnet.algoexplorerapi.io/";
  const port = "";
  return new algosdk.Algodv2(token, server, port);
}

export const setupIndexer = () => {
  let indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "");
  indexer.setIntEncoding(algosdk.IntDecoding.MIXED);
  return indexer;
};
