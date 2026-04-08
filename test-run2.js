require('dotenv').config();
const Replicate = require('replicate');
const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY });
async function test() {
  const output = await replicate.run(
    "unitedimaginations/gfcg-characters:1610dfda4da405064983ecfa0ecec5ee9e49cb48ab587be29afc60fa12c2aae2", 
    { input: { prompt: "A man", num_inference_steps: 1 } }
  );
  console.log("Methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(output[0])));
  console.log("Keys:", Object.keys(output[0]));
  console.log("String() representation:", String(output[0]));
  console.log(".url() method exists?", typeof output[0].url === 'function');
  if (typeof output[0].url === 'function') console.log(".url() value:", output[0].url());
}
test().catch(console.error);
