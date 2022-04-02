import algosdk from "algosdk";

export function setupClient() {
  const token = "";
  //const server = "https://node.algoexplorerapi.io/";
  const server = "https://node.testnet.algoexplorerapi.io/";
  const port = "";
  return new algosdk.Algodv2(token, server, port);
}
