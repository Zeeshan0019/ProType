import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

// Check if Groq API key exists
if (!process.env.GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY not found in .env file!");
  console.error("Please add your Groq API key to .env file:");
  console.error("GROQ_API_KEY=your_groq_api_key_here");
  console.error("Get one from: https://console.groq.com/keys");
  process.exit(1);
}

console.log("✅ Groq API key loaded successfully");

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Test route
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 HippoType Server with GPT-OSS-20B via Groq!", 
    model: "openai/gpt-oss-20b",
    provider: "groq",
    status: "active",
    timestamp: new Date().toISOString()
  });
});

// GPT-OSS-20B text generator via Groq API
app.get("/generate", async (req, res) => {
  try {
    const { domain } = req.query;
    const timestamp = Date.now();
    
    console.log(`🚀 Generating content for domain: ${domain} using GPT-OSS-20B via Groq at ${timestamp}`);
    
    // Add variety to prompts for unique content each time
    const randomSeed = Math.floor(Math.random() * 10000);
    const topics = {
      general: [
        "fascinating scientific breakthroughs", "historical mysteries", "technological innovations", 
        "natural wonders", "space discoveries", "ancient civilizations", "modern inventions",
        "environmental phenomena", "cultural achievements", "medical advances"
      ],
      story: [
        "time travel adventure", "mystery solving", "space exploration", "magical quest", 
        "detective work", "superhero journey", "underwater expedition", "forest adventure",
        "robot friendship", "treasure hunting"
      ],
      coding: [
        "algorithm optimization", "data structure design", "software architecture", "debugging techniques", 
        "code refactoring", "performance tuning", "security practices", "API development",
        "database design", "testing strategies"
      ]
    };
    
    const randomTopic = topics[domain] ? 
      topics[domain][Math.floor(Math.random() * topics[domain].length)] : 
      "interesting facts";
    
    let systemPrompt = "";
    let userPrompt = "";
    
    switch (domain) {
      case "story":
        systemPrompt = "You are a creative storyteller who writes engaging short stories for typing practice.";
        userPrompt = `Write a unique, captivating short story (3-4 sentences) about ${randomTopic}. Make it creative and fun but keep it simple for typing practice. No dialogue or quotation marks. Seed: ${randomSeed}`;
        break;
      case "coding":
        systemPrompt = "You are an experienced software developer who explains programming concepts clearly.";
        userPrompt = `Write an informative paragraph about ${randomTopic} in programming. Explain the concept clearly with practical insights. No code blocks, just explanatory text that's educational. Seed: ${randomSeed}`;
        break;
      default: // general
        systemPrompt = "You are an educational content creator who writes interesting and engaging factual content.";
        userPrompt = `Write a fascinating paragraph about ${randomTopic}. Include interesting facts that are educational and engaging. Make it suitable for typing practice with clear, flowing sentences. Seed: ${randomSeed}`;
    }

    // Call Groq API with GPT-OSS-20B model
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      model: "openai/gpt-oss-20b",
      temperature: 0.8,
      max_tokens: 200,
      top_p: 0.9,
      stream: false
    });

    const generatedText = chatCompletion.choices[0]?.message?.content || "";
    
    if (!generatedText.trim()) {
      throw new Error("Empty response from GPT-OSS-20B model");
    }
    
    // Clean the text for typing practice
    const cleanText = generatedText
      .replace(/\n+/g, ' ')           // Remove line breaks
      .replace(/\s+/g, ' ')           // Normalize spaces
      .replace(/[^\w\s.,!?;:'"()-]/g, '') // Remove special chars
      .replace(/"/g, "'")             // Replace quotes with apostrophes
      .replace(/\*\*/g, '')           // Remove markdown bold
      .replace(/\*/g, '')             // Remove markdown italics
      .trim();

    // Ensure reasonable length for typing (50-250 characters)
    let finalText = cleanText;
    if (cleanText.length > 250) {
      const sentences = cleanText.split(/[.!?]+/);
      finalText = sentences.slice(0, 2).join('. ').trim();
      if (!finalText.endsWith('.') && !finalText.endsWith('!') && !finalText.endsWith('?')) {
        finalText += '.';
      }
    } else if (cleanText.length < 50) {
      // If too short, request longer content
      throw new Error("Generated content too short, retrying...");
    }

    console.log(`✅ GPT-OSS-20B via Groq generated ${finalText.length} characters for ${domain}`);
    console.log(`📝 Topic: ${randomTopic}`);
    console.log(`🎯 Preview: ${finalText.substring(0, 80)}...`);
    
    res.json({ 
      text: finalText,
      domain: domain,
      model: "openai/gpt-oss-20b",
      provider: "groq",
      timestamp: timestamp,
      length: finalText.length,
      topic: randomTopic,
      success: true
    });

  } catch (err) {
    console.error("❌ GPT-OSS-20B via Groq Error:", err.message);
    
    // Provide helpful error messages
    let errorMessage = "Error generating text with GPT-OSS-20B";
    let statusCode = 500;
    
    if (err.message?.includes("401") || err.message?.includes("unauthorized")) {
      errorMessage = "Invalid Groq API key. Please check your GROQ_API_KEY in .env file";
      statusCode = 401;
    } else if (err.message?.includes("429") || err.message?.includes("rate limit")) {
      errorMessage = "Rate limit exceeded. Please wait a moment and try again";
      statusCode = 429;
    } else if (err.message?.includes("quota") || err.message?.includes("billing")) {
      errorMessage = "Groq API quota exceeded. Check your account at console.groq.com";
      statusCode = 402;
    }
    
    // Domain-specific fallback text
    const fallbacks = {
      general: "Artificial intelligence continues to revolutionize various industries through machine learning algorithms. These systems can process vast amounts of data to identify patterns and make predictions with remarkable accuracy.",
      story: "In a bustling digital world, a young programmer discovered an ancient coding secret hidden in legacy systems. This mysterious algorithm held the power to transform how computers understood human language.",
      coding: "Modern software development relies heavily on version control systems to manage code changes. Git repositories allow multiple developers to collaborate efficiently while maintaining a complete history of project modifications."
    };
    
    const fallbackText = fallbacks[req.query.domain] || fallbacks.general;
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: err.message,
      fallback_text: fallbackText,
      model: "openai/gpt-oss-20b",
      provider: "groq",
      timestamp: Date.now(),
      success: false
    });
  }
});

// Health check for GPT-OSS-20B via Groq
app.get("/test-model", async (req, res) => {
  try {
    console.log("🧪 Testing GPT-OSS-20B model via Groq...");
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: "Write a single sentence about the benefits of fast AI inference."
        }
      ],
      model: "openai/gpt-oss-20b",
      temperature: 0.7,
      max_tokens: 50
    });

    const response = chatCompletion.choices[0]?.message?.content || "No response";
    console.log("✅ GPT-OSS-20B via Groq test successful!");
    
    res.json({
      success: true,
      message: "GPT-OSS-20B via Groq is working perfectly!",
      model: "openai/gpt-oss-20b",
      provider: "groq",
      test_response: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Model test failed:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      model: "openai/gpt-oss-20b",
      provider: "groq",
      timestamp: new Date().toISOString()
    });
  }
});

// API usage info
app.get("/info", (req, res) => {
  res.json({
    service: "HippoType AI Content Generator",
    model: "openai/gpt-oss-20b",
    provider: "Groq Cloud",
    features: [
      "Ultra-fast inference",
      "Dynamic content generation", 
      "Domain-specific prompts",
      "Typing-optimized text",
      "Real-time generation"
    ],
    domains: ["general", "story", "coding"],
    endpoints: {
      generate: "/generate?domain={general|story|coding}",
      test: "/test-model",
      info: "/info"
    }
  });
});

app.listen(PORT, () => {
  console.log(`✅ HippoType Server with GPT-OSS-20B via Groq running at http://localhost:${PORT}`);
  console.log(`🚀 Model: openai/gpt-oss-20b via Groq Cloud`);
  console.log(`🧪 Test model at: http://localhost:${PORT}/test-model`);
  console.log(`📝 Generate content at: http://localhost:${PORT}/generate?domain=general`);
  console.log(`📊 API info at: http://localhost:${PORT}/info`);
});
