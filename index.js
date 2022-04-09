import { getMintQuote } from "./helpers/getQuote.js";

getMintQuote().catch((err) => console.error(err.message));
