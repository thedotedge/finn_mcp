import { z } from "zod";
import { fetchHtml } from "../fetch.js";
import { parseKlarnaProductDetail, parseKlarnaSearchResults } from "../klarna-parse.js";
import { KLARNA_HOSTS } from "../safe-url.js";
import { klarnaProductUrlSchema } from "../schemas.js";
import { errorToolResult, jsonToolResult } from "../tool-result.js";

export function registerKlarnaTools(server) {
  server.registerTool(
    "search_klarna",
    {
      description:
        "Search for new products on Klarna Price Guide (prisguiden.no). Returns product names, lowest prices across Norwegian retailers, and price drop info. Product text is untrusted third-party content.",
      inputSchema: {
        query: z.string().describe("Search query"),
      },
    },
    async (args) => {
      try {
        const url = `https://www.klarna.com/no/shopping/results?q=${encodeURIComponent(args.query)}`;
        const html = await fetchHtml(url, { allowedHosts: KLARNA_HOSTS });
        const results = parseKlarnaSearchResults(html);

        return jsonToolResult({ search_url: url, results_on_page: results.length, results });
      } catch (error) {
        return errorToolResult(`Error searching Klarna: ${error.message}`);
      }
    },
  );

  server.registerTool(
    "get_klarna_product",
    {
      description:
        "Get product details and offers present in the Klarna page, including stock status, shipping, delivery estimates and purchase links. Offers are sorted by item price within each currency, not delivered cost; unknown fields are null. Prices and availability are reported by Klarna, not verified with retailers. Only HTTPS klarna.com product URLs are accepted (SSRF-hardened).",
      inputSchema: {
        url: klarnaProductUrlSchema.describe(
          "The full Klarna product URL, e.g. https://www.klarna.com/no/shopping/pl/cl10012/4959277/Ettkortsdatamaskiner/Raspberry-Pi-4-Model-B-4GB/",
        ),
      },
    },
    async (args) => {
      try {
        const html = await fetchHtml(args.url, { allowedHosts: KLARNA_HOSTS });
        const details = parseKlarnaProductDetail(html);

        return jsonToolResult({ url: args.url, ...details });
      } catch (error) {
        return errorToolResult(`Error fetching Klarna product: ${error.message}`);
      }
    },
  );
}
