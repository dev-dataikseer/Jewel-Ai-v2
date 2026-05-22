import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const provider = await prisma.providerSetting.findUnique({ where: { provider: 'GEMINI' } });
  const apiKey = provider?.encryptedApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY in environment or database');
    return;
  }
  
  const modelName = 'nano-banana-pro-preview';
  console.log(`Testing model: ${modelName}`);

  const imagePath = 'D:\\Worksplace\\Software_Projects\\Jewel AI\\docs\\Raw_Images\\3.jpeg';
  const data = await fs.readFile(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = mime.getType(ext) || 'image/jpeg';
  
  const ai = new GoogleGenAI({ apiKey });
  const prompt = "A professional luxury ring product shot. The jewelry piece is crafted from premium 18k Yellow Gold. Follow style preset aesthetic: clean white seamless background, soft studio shadows, true-to-product colors, premium ecommerce catalog composition, macro photography, 100mm lens. SYSTEM:\nYou are a professional luxury jewelry image editing assistant. Your goal is to produce photorealistic, commercially usable jewelry visuals while maintaining absolute fidelity to the original product.";
  
  const parts: any[] = [
    { text: prompt },
    { inlineData: { data: data.toString('base64'), mimeType } }
  ];

  console.log('Sending request to SDK...');
  const start = Date.now();
  
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      config: {
        imageConfig: {
          aspectRatio: '1:1',
          imageSize: '1K',
          personGeneration: 'ALLOW_ADULT',
        },
        responseModalities: ['IMAGE', 'TEXT'],
      },
      contents: [{ role: 'user', parts }],
    });

    let imageBuffer: Buffer | null = null;
    let fullText = '';
    
    // Non-streaming response parsing
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          imageBuffer = Buffer.from(part.inlineData.data, 'base64');
        }
        if (part.text) {
          fullText += part.text;
        }
      }
    }

    const end = Date.now();
    console.log(`SDK test completed in ${end - start}ms`);
    
    if (imageBuffer) {
      console.log(`Success! Image buffer size: ${imageBuffer.length} bytes`);
      const outPath = 'D:\\Worksplace\\Software_Projects\\Jewel AI\\docs\\Raw_Images\\results\\test_result.png';
      await fs.mkdir('D:\\Worksplace\\Software_Projects\\Jewel AI\\docs\\Raw_Images\\results', { recursive: true });
      await fs.writeFile(outPath, imageBuffer);
      console.log(`Saved result to ${outPath}`);
    } else {
      console.log(`No image returned. Text: ${fullText}`);
    }
  } catch (err: any) {
    console.error('SDK request failed:', err.message);
    
    console.log('Falling back to REST API...');
    const restStart = Date.now();
    const restParts = [
      { text: prompt },
      { inline_data: { mime_type: mimeType, data: data.toString('base64') } }
    ];
    
    try {
      const fetchResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: restParts }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
          })
        }
      );
      
      const restEnd = Date.now();
      console.log(`REST request completed in ${restEnd - restStart}ms. Status: ${fetchResp.status}`);
      
      if (!fetchResp.ok) {
        console.error('REST body:', await fetchResp.text());
        return;
      }
      
      const result = await fetchResp.json() as any;
      const outputPart = result.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData?.data || part.inline_data?.data
      );
      const base64 = outputPart?.inlineData?.data || outputPart?.inline_data?.data;
      
      if (base64) {
        const imageBuffer = Buffer.from(base64, 'base64');
        console.log(`REST Success! Image buffer size: ${imageBuffer.length} bytes`);
        const outPath = 'D:\\Worksplace\\Software_Projects\\Jewel AI\\docs\\Raw_Images\\results\\test_result_rest.png';
        await fs.mkdir('D:\\Worksplace\\Software_Projects\\Jewel AI\\docs\\Raw_Images\\results', { recursive: true });
        await fs.writeFile(outPath, imageBuffer);
        console.log(`Saved result to ${outPath}`);
      } else {
        console.log(`REST returned no image. Output:`, JSON.stringify(result));
      }
      
    } catch (restErr: any) {
      console.error('REST request failed:', restErr.message);
    }
  }
}

main().catch(console.error);
