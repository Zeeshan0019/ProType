import { Groq } from 'groq-sdk';

const groq = new Groq();
const ai = new groq({ apiKey: process.env.Groq });



for await (const chunk of ai) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}

