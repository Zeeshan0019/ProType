// test.js - Quick API key test
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

console.log('🔑 Testing new API key...');
console.log('Key loaded:', process.env.GROQ_API_KEY ? 'Yes' : 'No');
console.log('Key preview:', process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.substring(0, 10) + '...' : 'Missing');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function testNewKey() {
  try {
    console.log('🤖 Testing GPT-OSS-20B with new key...');
    
    const completion = await groq.chat.completions.create({
      messages: [{ 
        role: "user", 
        content: "Say hello and confirm you are working." 
      }],
      model: "openai/gpt-oss-20b",
      max_tokens: 50,
      temperature: 0.7
    });
    
    const response = completion.choices[0]?.message?.content;
    
    if (response && response.trim()) {
      console.log('✅ SUCCESS! New API key works!');
      console.log('Response:', response);
      console.log('🎉 Your ProType project should work now!');
    } else {
      console.log('❌ Empty response - API key might have issues');
    }
    
  } catch (error) {
    console.log('❌ API key test failed:');
    console.log('Error:', error.message);
    
    if (error.message.includes('401') || error.message.includes('authentication')) {
      console.log('🔴 This looks like an API key authentication error');
      console.log('✅ Double-check your API key is correct and active');
    }
  }
}

testNewKey();
