const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Replicate = require('replicate');
const sharp = require('sharp');
require('dotenv').config();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY,
});

async function main() {
  console.log("1. Fetching Replicate Account Info...");
  const account = await replicate.accounts.current();
  const username = account.username;
  console.log(`Authenticated as: ${username}`);

  const modelName = "gfcg-characters";
  
  console.log(`2. Ensuring destination model ${username}/${modelName} exists...`);
  try {
    // Try to get it
    await replicate.models.get(username, modelName);
    console.log("Model already exists.");
  } catch (e) {
    console.log("Model does not exist. Creating it...");
    await replicate.models.create(username, modelName, {
      visibility: "private",
      hardware: "gpu-t4",
      description: "Auto-trained LoRA for GFCG Characters"
    });
    console.log("Model created!");
  }

  console.log("3. Packaging images and captions...");
  const tempDir = path.join(__dirname, 'lora_temp');
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
  fs.mkdirSync(tempDir);

  const imagesDir = path.join(__dirname, '../public/assets/characters');
  let fileCount = 0;

  // Helper function to recursively find all images in a directory
  const getImagesRecursive = (dir, fileList = []) => {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        getImagesRecursive(filePath, fileList);
      } else if (filePath.match(/\.(jpg|jpeg|png|webp)$/i)) {
        fileList.push(filePath);
      }
    }
    return fileList;
  };

  // Package Brows
  const browsFiles = getImagesRecursive(path.join(imagesDir, 'brows'));
  for (const filePath of browsFiles) {
    await sharp(filePath)
      .resize(1024, 1024, { fit: 'inside' })
      .jpeg({ quality: 90 })
      .toFile(path.join(tempDir, `brows_${fileCount}.jpg`));
    
    // Strict non-bleeding caption. We do NOT add descriptions like "mustache".
    // This forces the AI to memorize the visual topology specifically under this nonsense token.
    fs.writeFileSync(path.join(tempDir, `brows_${fileCount}.txt`), "sks_brows");
    fileCount++;
  }

  // Package Glasses
  const glassesFiles = getImagesRecursive(path.join(imagesDir, 'Glasses'));
  for (const filePath of glassesFiles) {
    await sharp(filePath)
      .resize(1024, 1024, { fit: 'inside' })
      .jpeg({ quality: 90 })
      .toFile(path.join(tempDir, `glasses_${fileCount}.jpg`));
    
    // Strict non-bleeding caption.
    fs.writeFileSync(path.join(tempDir, `glasses_${fileCount}.txt`), "sks_glasses");
    fileCount++;
  }

  console.log(`Packaged ${fileCount} images and strict captions...`);
  
  const zipPath = path.join(__dirname, 'lora_data.zip');
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  
  execSync(`cd ${tempDir} && zip -r ../lora_data.zip ./*`);
  console.log("Created lora_data.zip!");

  console.log("4. Uploading to Replicate temporary storage...");
  const fileBuffer = fs.readFileSync(zipPath);
  const dataFile = await replicate.files.create(fileBuffer, { name: "lora_data.zip" });
  console.log(`Uploaded! File ID: ${dataFile.id}`);

  console.log("5. Starting LoRA Training Job...");
  try {
    const training = await replicate.trainings.create(
      "ostris",
      "flux-dev-lora-trainer",
      "26dce37af90b9d997eeb970d92e47de3064d46c300504ae376c75bef6a9022d2", // Active version hash
      {
        destination: `${username}/${modelName}`,
        input: {
          steps: 1000, // Safe, cost-effective run for 40-image dense datasets
          resolution: "1024", // Maximize topological fidelity (prevents face smudging)
          input_images: dataFile.urls.get // The internal Replicate URL
        }
      }
    );

    console.log("===================================");
    console.log("TRAINING STARTED SUCCESSFULLY!");
    console.log(`Training ID: ${training.id}`);
    console.log(`You can track progress here: https://replicate.com/p/${training.id}`);
    console.log(`Once finished, the model will be available at: ${username}/${modelName}`);
    console.log("===================================");
  } catch (error) {
    console.error("\n*** REPLICATE API ERROR ***");
    console.error(error.message);
    if (error.response) {
      console.log("Status:", error.response.status);
    }
  }
}

main().catch(console.error);
