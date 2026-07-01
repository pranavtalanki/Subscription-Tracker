var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var PORT = 3e3;
var aiClient = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "1mb" }));
  app.post("/api/parse-email", async (req, res) => {
    try {
      const { subject, body } = req.body;
      if (!subject && !body) {
        res.status(400).json({ error: "At least one of subject or body must be provided" });
        return;
      }
      const client = getAiClient();
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Please parse subscription details from this email confirmation.
Subject: ${subject || "(No Subject)"}
Body:
${body || "(No Body)"}

Instructions:
1. Identify the name of the subscription.
2. Determine the recurring price/amount charged.
3. Identify the 3-letter currency code (e.g. USD, EUR, GBP, CAD). Default to USD if undetermined.
4. Categorize it into: 'Entertainment', 'Utilities', 'Health & Fitness', 'Software & Services', 'Financial', or 'Other'.
5. Extract the billing frequency / cycle. It MUST be one of 'weekly', 'monthly', or 'yearly'. Default to 'monthly'.
6. Based on the billing frequency and current year (2026), calculate or estimate the NEXT recurring billing date (YYYY-MM-DD format).
7. Extract the payment method/mode if visible (e.g. Visa ****1234, Mastercard, PayPal, Apple Pay, Bank Account, etc.).
8. Provide a short note describing what was parsed or plan detailed (e.g., "Premium plan receipt").`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              name: { type: import_genai.Type.STRING, description: "Brand or subscription name (e.g. Netflix, Spotify, Gold's Gym)" },
              amount: { type: import_genai.Type.NUMBER, description: "The recurring charge amount (numerical)" },
              currency: { type: import_genai.Type.STRING, description: "Currency code, e.g. USD, EUR" },
              billingCycle: { type: import_genai.Type.STRING, description: "Must be weekly, monthly, or yearly" },
              nextBillingDate: { type: import_genai.Type.STRING, description: "Date in YYYY-MM-DD format" },
              paymentMethod: { type: import_genai.Type.STRING, description: "Payment mechanism or card last 4 digits" },
              category: { type: import_genai.Type.STRING, description: "Entertainment, Utilities, Health & Fitness, Software & Services, Financial, or Other" },
              notes: { type: import_genai.Type.STRING, description: "Brief description of what this email says" }
            },
            required: ["name", "amount", "currency", "billingCycle", "nextBillingDate", "paymentMethod", "category"]
          }
        }
      });
      if (!response.text) {
        throw new Error("No content returned from Gemini");
      }
      const parsedData = JSON.parse(response.text.trim());
      res.json(parsedData);
    } catch (error) {
      console.error("Error parsing email with Gemini:", error);
      res.status(500).json({ error: error?.message || "Failed to parse subscription from email" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Error starting server:", err);
});
//# sourceMappingURL=server.cjs.map
