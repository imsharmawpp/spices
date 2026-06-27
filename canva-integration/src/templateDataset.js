// Inspect a brand template's autofill dataset (field names + types).
// Usage: npm run dataset -- <brand_template_id>
import { getBrandTemplateDataset } from "./canvaClient.js";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npm run dataset -- <brand_template_id>");
    process.exit(1);
  }

  const dataset = await getBrandTemplateDataset(id);
  const fields = Object.entries(dataset);

  if (fields.length === 0) {
    console.log("This template has no autofillable data fields.");
    return;
  }

  console.log(`\nDataset for brand template ${id}:\n`);
  for (const [name, def] of fields) {
    console.log(`• ${name}  (${def.type})`);
  }

  // Print a ready-to-paste products.json "autofillData" skeleton.
  const skeleton = {};
  for (const [name, def] of fields) {
    if (def.type === "text") skeleton[name] = { type: "text", text: "" };
    else if (def.type === "image")
      skeleton[name] = { type: "image", path: "assets/your-image.png" };
    else skeleton[name] = { type: def.type };
  }
  console.log("\nautofillData skeleton (copy into products.json):\n");
  console.log(JSON.stringify(skeleton, null, 2) + "\n");
}

main().catch((err) => {
  console.error("\n❌", err.message);
  process.exit(1);
});
