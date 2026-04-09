import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import sharp from 'sharp';

// Allow up to 60s for Replicate inference on Vercel Hobby tier
export const maxDuration = 60;

const MAX_PROMPT_LENGTH = 1000;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // --- Authentication Gate ---
    const password = body?.password;
    const expectedPassword = process.env.GENERATION_PASSWORD;
    if (expectedPassword && password !== expectedPassword) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    // --- Input Validation ---
    const rawPrompt = body?.prompt;
    if (!rawPrompt || typeof rawPrompt !== 'string') {
      return NextResponse.json({ error: 'A text prompt is required.' }, { status: 400 });
    }
    const prompt = rawPrompt.slice(0, MAX_PROMPT_LENGTH).trim();
    if (prompt.length === 0) {
      return NextResponse.json({ error: 'Prompt cannot be empty.' }, { status: 400 });
    }

    if (!process.env.REPLICATE_API_TOKEN && !process.env.REPLICATE_API_KEY) {
      return NextResponse.json({ error: 'Image generation is not configured.' }, { status: 500 });
    }

    // --- Build IP-Adapter image array ---
    const input_images: string[] = [];
    let imageIndex = 1;

    const loadCharacterImages = async (folderName: string): Promise<string> => {
      try {
        const origin = new URL(req.url).origin;
        
        let imagePath = '';
        if (folderName.toLowerCase().includes('andrew')) {
            imagePath = encodeURI('/char/andrew clarke/Andrew Clarke Shoulder shot.png');
        } else {
            imagePath = encodeURI('/char/james wilson/James Wilson shouldershot.png');
        }

        const absoluteUrl = `${origin}${imagePath}`;
        const resp = await fetch(absoluteUrl);
        if (!resp.ok) {
            return '';
        }

        const arrayBuffer = await resp.arrayBuffer();
        const buffer = await sharp(arrayBuffer).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 100 }).toBuffer();
        
        input_images.push(`data:image/jpeg;base64,${buffer.toString('base64')}`);
        
        const currentIndex = imageIndex;
        imageIndex++;
        
        return `image ${currentIndex}`;
      } catch {
         return '';
      }
    }

    // Determine intent
    let wantsAndrew = /(Andrew|Clarke)/i.test(prompt);
    let wantsJames = /(James|Wilson)/i.test(prompt);

    const impliesMultiple = /\b(they|together|friends|men|guys|both guys|two guys|two men|the other guy)\b/i.test(prompt);
    if (impliesMultiple) {
      wantsAndrew = true;
      wantsJames = true;
    }

    // Chronological ordering for IP-Adapter identity mapping
    const andrewPosition = prompt.toLowerCase().indexOf('andrew') !== -1 ? prompt.toLowerCase().indexOf('andrew') : 9999;
    const clarkePosition = prompt.toLowerCase().indexOf('clarke') !== -1 ? prompt.toLowerCase().indexOf('clarke') : 9999;
    const aIdx = Math.min(andrewPosition, clarkePosition);

    const jamesPosition = prompt.toLowerCase().indexOf('james') !== -1 ? prompt.toLowerCase().indexOf('james') : 9999;
    const wilsonPosition = prompt.toLowerCase().indexOf('wilson') !== -1 ? prompt.toLowerCase().indexOf('wilson') : 9999;
    const jIdx = Math.min(jamesPosition, wilsonPosition);

    let jamesIsFirst = false;
    if (wantsJames && wantsAndrew && (jIdx < aIdx)) {
        jamesIsFirst = true;
    } else if (wantsJames && !wantsAndrew) {
        jamesIsFirst = true;
    }

    let suffixDefinitions = 'Note: ';
    
    if (jamesIsFirst) {
      const idxStr1 = await loadCharacterImages('james wilson');
      if (idxStr1) suffixDefinitions += `James is the exact man shown in ${idxStr1}. `;
      if (wantsAndrew) {
        const idxStr2 = await loadCharacterImages('andrew clarke');
        if (idxStr2) suffixDefinitions += `Andrew is the exact man shown in ${idxStr2}. `;
      }
    } else {
      if (wantsAndrew) {
        const idxStr1 = await loadCharacterImages('andrew clarke');
        if (idxStr1) suffixDefinitions += `Andrew is the exact man shown in ${idxStr1}. `;
      }
      if (wantsJames) {
        const idxStr2 = await loadCharacterImages('james wilson');
        if (idxStr2) suffixDefinitions += `James is the exact man shown in ${idxStr2}. `;
      }
    }

    // Fallback: If they mentioned nothing specific, load both.
    if (!wantsAndrew && !wantsJames) {
       const aIdx = await loadCharacterImages('andrew clarke');
       const jIdx = await loadCharacterImages('james wilson');
       suffixDefinitions = `Note: Andrew is the exact man shown in ${aIdx}. James is the exact man shown in ${jIdx}. `;
    }

    const enhancedPrompt = `${prompt}. ${suffixDefinitions} professional corporate photography, natural lighting, high quality, photorealistic, 85mm lens.`;
    
    const output = await replicate.run(
      "black-forest-labs/flux-2-pro", 
      {
        input: {
          prompt: enhancedPrompt,
          input_images: input_images,
          output_format: "png",
          safety_tolerance: 5
        }
      }
    );

    let imageUrl = '';
    if (Array.isArray(output)) {
      imageUrl = output[0].toString();
    } else {
      imageUrl = output.toString();
    }

    return NextResponse.json({ imageUrl });

  } catch (error: any) {
    console.error('Generation failed:', error);
    return NextResponse.json(
      { error: 'Image generation failed. Please try again.' },
      { status: 500 }
    );
  }
}
