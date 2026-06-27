// Generate and export the product images. Supports three modes (see .env.example).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PATHS, config } from "./config.js";
import {
  autofillBrandTemplate,
  createCustomDesign,
  download,
  exportDesignPng,
  getCurrentUser,
  uploadAsset,
} from "./canvaClient.js";

function loadProducts() {
  const raw = JSON.parse(fs.readFileSync(PATHS.products, "utf8"));
  return raw.products ?? [];
}

/** Resolve an image reference (local path or URL) to a local file path. */
async function resolveToLocalFile(ref) {
  if (/^https?:\/\//.test(ref)) {
    const tmp = path.join(os.tmpdir(), `canva-src-${Date.now()}-${path.basename(ref).split("?")[0] || "img"}`);
    await download(ref, tmp);
    return tmp;
  }
  const abs = path.isAbsolute(ref) ? ref : path.join(PATHS.products, "..", ref);
  if (!fs.existsSync(abs)) {
    throw new Error(`Source image not found: ${ref} (resolved ${abs})`);
  }
  return abs;
}

/** Replace image fields ({path|url}) in autofill data with uploaded asset_ids. */
async function materializeAutofillData(data) {
  const out = {};
  for (const [field, value] of Object.entries(data)) {
    if (value?.type === "image" && !value.asset_id && (value.path || value.url)) {
      const local = await resolveToLocalFile(value.path || value.url);
      const asset = await uploadAsset(local, `${field}`);
      out[field] = { type: "image", asset_id: asset.id };
    } else {
      out[field] = value;
    }
  }
  return out;
}

async function generateOne(product, mode) {
  const title = product.title || product.key;
  let design;

  if (mode === "autofill") {
    if (!config.brandTemplateId) {
      throw new Error("MODE=autofill requires CANVA_BRAND_TEMPLATE_ID in .env");
    }
    const data = await materializeAutofillData(product.autofillData || {});
    design = await autofillBrandTemplate({
      brandTemplateId: config.brandTemplateId,
      title,
      data,
    });
  } else if (mode === "asset") {
    if (!product.image) {
      throw new Error(`Product ${product.key} has no "image" for MODE=asset`);
    }
    const local = await resolveToLocalFile(product.image);
    const asset = await uploadAsset(local, title.slice(0, 50));
    design = await createCustomDesign({
      width: config.imageWidth,
      height: config.imageHeight,
      title,
      assetId: asset.id,
    });
  } else if (mode === "blank") {
    design = await createCustomDesign({
      width: config.imageWidth,
      height: config.imageHeight,
      title,
    });
  } else {
    throw new Error(`Unknown CANVA_GENERATE_MODE: ${mode}`);
  }

  const urls = await exportDesignPng({
    designId: design.id,
    width: config.imageWidth,
    height: config.imageHeight,
  });

  fs.mkdirSync(PATHS.output, { recursive: true });
  const saved = [];
  for (let i = 0; i < urls.length; i++) {
    const suffix = urls.length > 1 ? `-p${i + 1}` : "";
    const dest = path.join(PATHS.output, `${product.key}${suffix}.png`);
    await download(urls[i], dest);
    saved.push(dest);
  }
  return { designId: design.id, editUrl: design.urls?.edit_url, saved };
}

async function main() {
  const mode = config.generateMode;
  console.log(`\nMode: ${mode}`);

  // Sanity check auth + surface which account we're acting on.
  const me = await getCurrentUser();
  console.log("Authenticated as team/user:", JSON.stringify(me));

  const products = loadProducts();
  console.log(`Generating ${products.length} product image(s)...\n`);

  const results = [];
  for (const product of products) {
    process.stdout.write(`• ${product.title} ... `);
    try {
      const r = await generateOne(product, mode);
      console.log("done ->", r.saved.map((p) => path.basename(p)).join(", "));
      results.push(r);
    } catch (err) {
      console.log("FAILED");
      console.error("   ", err.message);
    }
  }

  console.log(`\nSaved files in: ${PATHS.output}`);
}

main().catch((err) => {
  console.error("\n❌", err.message);
  process.exit(1);
});
