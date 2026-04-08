require('dotenv').config();
const Replicate = require('replicate');
const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY });
async function test() {
  console.log("Running replicate prediction...");
  const output = await replicate.run(
    "unitedimaginations/gfcg-characters:1610dfda4da405064983ecfa0ecec5ee9e49cb48ab587be29afc60fa12c2aae2", 
    { input: { prompt: "A man", num_inference_steps: 1 } }
  );
  console.log("Raw output type:", typeof output);
  console.log("Is array?", Array.isArray(output));
  console.dir(output, {depth: null});
}
test().catch(console.error);
