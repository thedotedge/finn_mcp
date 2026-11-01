import { z } from "zod";
import { FINN_CODE_PATTERN } from "./safe-url.js";

export const finnCodeSchema = z.string().regex(FINN_CODE_PATTERN, "FINN-kode must be a numeric ID (5–12 digits)");

export const klarnaProductUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && /(^|\.)klarna\.com$/i.test(url.hostname);
    } catch {
      return false;
    }
  }, "URL must be an HTTPS Klarna product page (klarna.com)");
