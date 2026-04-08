import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!process.env.REPLICATE_API_TOKEN && !process.env.REPLICATE_API_KEY) {
      return NextResponse.json({ error: 'Replicate API Token not configured' }, { status: 500 });
    }

    // 1. We dynamically build the IP-Adapter array from the multi-image folders
    const input_images: string[] = [];
    let imageIndex = 1;

    const loadCharacterImages = async (folderName: string): Promise<string> => {
      try {
        // Production Vercel Safeguard: Serverless functions (Lambda) physically detach from the `public/` directory during build.
        // The most robust way to access static assets in Next.js Serverless routes is to fetch them dynamically from our own CDN via URL.
        const origin = new URL(req.url).origin;
        
        let imagePath = '';
        if (folderName.toLowerCase().includes('andrew')) {
            imagePath = encodeURI('/char/andrew clarke/Andrew Clarke Shoulder shot.png');
        } else {
            imagePath = encodeURI('/char/james wilson/James Wilson shouldershot.png');
        }

        const absoluteUrl = `${origin}${imagePath}`;
        console.log(`Fetching IP-Adapter image from Edge CDN: ${absoluteUrl}`);

        const resp = await fetch(absoluteUrl);
        if (!resp.ok) {
            console.error(`Vercel CDN Fetch Failed: ${resp.status} for ${absoluteUrl}`);
            return '';
        }

        const arrayBuffer = await resp.arrayBuffer();
        
        // We vastly upgrade the dataset payload to 1024x1024 @ 100% Quality. 
        // At max density, this hits ~350KB per image, perfectly evading Replicate's 10MB limit
        // while delivering maximum structural skin/fabric pore data to the IP-Adapter.
        const buffer = await sharp(arrayBuffer).resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 100 }).toBuffer();
        
        input_images.push(`data:image/jpeg;base64,${buffer.toString('base64')}`);
        
        const currentIndex = imageIndex;
        imageIndex++;
        
        return `image ${currentIndex}`;
      } catch (e) {
         console.error("Serverless edge fetch error:", e);
         return '';
      }
    }

    // Determine intent
    let wantsAndrew = /(Andrew|Clarke)/i.test(prompt);
    let wantsJames = /(James|Wilson)/i.test(prompt);

    // If the user types "the other guy" or "both guys", they implied the second character without explicitly naming him!
    // We restrict this regex strictly to humans to prevent false positives like "both hands" triggering the second character's IP-Adapter.
    const impliesMultiple = /\b(they|together|friends|men|guys|both guys|two guys|two men|the other guy)\b/i.test(prompt);
    if (impliesMultiple) {
      wantsAndrew = true;
      wantsJames = true;
    }

    // We determine who was chronologically mentioned FIRST in the sentence.
    // IP-Adapters physically map `image 1` to the first structural human subject described in the prompt.
    // We MUST synchronize the API Array Injection order to match the chronological sentence order to prevent identity swapping!
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
    
    // Inject the IP-Adapter payloads exactly chronologically
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

    // Fallback: If they mentioned nothing specific, load both and force them in.
    if (!wantsAndrew && !wantsJames) {
       const aIdx = await loadCharacterImages('andrew clarke');
       const jIdx = await loadCharacterImages('james wilson');
       suffixDefinitions = `Note: Andrew is the exact man shown in ${aIdx}. James is the exact man shown in ${jIdx}. `;
    }

    // The user owns the composition natively. We never mutate their grammatical string!
    // We simply append the definitions and the photographic aesthetic wrapper to the suffix.
    const enhancedPrompt = `${prompt}. ${suffixDefinitions} professional corporate photography, natural lighting, high quality, photorealistic, 85mm lens.`;

    console.log("Calling Next-Gen FLUX.2 PRO endpoint with images:", input_images.length);
    
    // 3. The FLUX.2 Multi-IP Payload
    const output = await replicate.run(
      "black-forest-labs/flux-2-pro", 
      {
        input: {
          prompt: enhancedPrompt,
          input_images: input_images, // Dynamically sized array!
          output_format: "png",
          safety_tolerance: 5
        }
      }
    );

    let imageUrl = '';
    // Safely parse the dynamically routed FLUX.2 Output
    if (Array.isArray(output)) {
      imageUrl = output[0].toString();
    } else {
      imageUrl = output.toString();
    }

    return NextResponse.json({ imageUrl });

  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
