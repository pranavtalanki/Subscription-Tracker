import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

// Initialize Google GenAI client lazily to avoid crashing on startup if the API key is not yet set
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // API endpoint to parse email confirmation contents using Gemini
  app.post('/api/parse-email', async (req, res) => {
    try {
      const { subject, body } = req.body;

      if (!subject && !body) {
        res.status(400).json({ error: 'At least one of subject or body must be provided' });
        return;
      }

      const client = getAiClient();

      const response = await client.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Please parse subscription details from this email confirmation.
Subject: ${subject || '(No Subject)'}
Body:
${body || '(No Body)'}

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
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Brand or subscription name (e.g. Netflix, Spotify, Gold\'s Gym)' },
              amount: { type: Type.NUMBER, description: 'The recurring charge amount (numerical)' },
              currency: { type: Type.STRING, description: 'Currency code, e.g. USD, EUR' },
              billingCycle: { type: Type.STRING, description: 'Must be weekly, monthly, or yearly' },
              nextBillingDate: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' },
              paymentMethod: { type: Type.STRING, description: 'Payment mechanism or card last 4 digits' },
              category: { type: Type.STRING, description: 'Entertainment, Utilities, Health & Fitness, Software & Services, Financial, or Other' },
              notes: { type: Type.STRING, description: 'Brief description of what this email says' },
            },
            required: ['name', 'amount', 'currency', 'billingCycle', 'nextBillingDate', 'paymentMethod', 'category'],
          },
        },
      });

      if (!response.text) {
        throw new Error('No content returned from Gemini');
      }

      const parsedData = JSON.parse(response.text.trim());
      res.json(parsedData);
    } catch (error: any) {
      console.error('Error parsing email with Gemini:', error);
      res.status(500).json({ error: error?.message || 'Failed to parse subscription from email' });
    }
  });

  // Serve static UI assets and Vite dev/prod configuration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
});
