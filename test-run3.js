require('dotenv').config();
const Replicate = require('replicate');
const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY });
async function test() {
  const model = await replicate.models.get("unitedimaginations", "gfcg-characters");
  console.log("Latest Version Hash:", model.latest_version.id);
}
test().catch(console.error);
