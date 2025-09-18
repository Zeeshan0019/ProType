import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();


app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = 5000;

if (!process.env.GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY not found!");
  process.exit(1);
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Generate content
app.get("/generate", async (req, res) => {
  try {
    const { domain = 'general' } = req.query;
    
    // Simple prompts
    let prompt;
    switch (domain) {
      case "story":
        prompt = "Write a short creative story about adventure in 2-3 sentences for typing practice.";
        break;
      case "coding":
        prompt = "Write an interesting programming fact in 2-3 sentences for typing practice.";
        break;
      default:
        prompt = "Write an interesting science or technology fact in 2-3 sentences for typing practice.";
    }

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      max_tokens: 150,
      temperature: 0.7,
      top_p: 0.9
    });

    const text = completion.choices[0]?.message?.content || "";
    
    if (!text.trim()) {
      throw new Error("Empty response");
    }
    
    // Clean text
    const cleanText = text
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?;:'"()-]/g, '')
      .replace(/"/g, "'")
      .trim();

    res.json({ 
      text: cleanText,
      domain,
      success: true
    });

  } catch (err) {
    // Fallback content
    const fallbacks = {
      general: "The human brain processes information through 86 billion neurons that communicate via electrical signals. This complex network enables learning, memory, and conscious thought.",
      story: "Detective Sarah found a cryptic message hidden in the old library's computer system. The mysterious code led her on an adventure to discover a long-lost digital treasure.",
      coding: "Modern JavaScript engines use just-in-time compilation to optimize code execution. This technique allows dynamic languages to achieve performance comparable to compiled languages."
    };
    
    res.json({ 
      text: fallbacks[req.query.domain] || fallbacks.general,
      domain: req.query.domain,
      success: false
    });
  }
});

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ 
    message: "ProType Server Running!",
    status: "active"
  });
});

app.listen(PORT, () => {
  console.log(`✅ ProType Server running at http://localhost:${PORT}`);
});
