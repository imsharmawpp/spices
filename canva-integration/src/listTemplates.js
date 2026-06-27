// List the user's Canva brand templates (helps you find a CANVA_BRAND_TEMPLATE_ID).
// Usage: npm run templates [-- "search term"]
import { listBrandTemplates } from "./canvaClient.js";

async function main() {
  const query = process.argv[2];
  // `dataset: non_empty` surfaces templates that actually have autofill fields.
  const items = await listBrandTemplates({ query, dataset: "non_empty" });

  if (items.length === 0) {
    console.log(
      "No brand templates with autofill fields found.\n" +
        "Create a design with data fields in Canva and publish it as a Brand Template."
    );
    return;
  }

  console.log(`\nFound ${items.length} brand template(s) with autofill fields:\n`);
  for (const t of items) {
    console.log(`• ${t.title}`);
    console.log(`    id:   ${t.id}`);
    console.log(`    view: ${t.view_url}`);
  }
  console.log(
    "\nInspect a template's fields with:\n  npm run dataset -- <brand_template_id>\n"
  );
}

main().catch((err) => {
  console.error("\n❌", err.message);
  process.exit(1);
});
