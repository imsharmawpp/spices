// Thin wrapper over the Canva Connect REST API used by the generator.
import fs from "node:fs";
import { API_BASE } from "./config.js";
import { getValidAccessToken } from "./tokenStore.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(pathname, { method = "GET", json, headers = {}, body } = {}) {
  const token = await getValidAccessToken();
  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json ? JSON.stringify(json) : body,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`${method} ${pathname} -> ${res.status}: ${text}`);
  }
  return data;
}

/** Poll an async job endpoint until it succeeds or fails. */
async function pollJob(pathname, pick, { tries = 30, intervalMs = 2000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const data = await api(pathname);
    const job = pick(data);
    if (job.status === "success") return job;
    if (job.status === "failed") {
      throw new Error(`Job failed: ${JSON.stringify(job.error ?? job)}`);
    }
    await sleep(intervalMs);
  }
  throw new Error(`Job timed out after ${tries} attempts: ${pathname}`);
}

/** Who is the authenticated user (sanity check). */
export async function getCurrentUser() {
  return api("/users/me");
}

/** Upload a local file as an asset; returns the asset object. */
export async function uploadAsset(filePath, name) {
  const token = await getValidAccessToken();
  const bytes = fs.readFileSync(filePath);
  const nameBase64 = Buffer.from(name).toString("base64");
  const res = await fetch(`${API_BASE}/asset-uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({ name_base64: nameBase64 }),
    },
    body: bytes,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`asset-uploads -> ${res.status}: ${text}`);
  const job = await pollJob(
    `/asset-uploads/${data.job.id}`,
    (d) => d.job
  );
  return job.asset;
}

/** Create a custom-sized design, optionally inserting an image asset. */
export async function createCustomDesign({ width, height, title, assetId }) {
  const json = {
    type: "type_and_asset",
    design_type: { type: "custom", width, height },
    title,
  };
  if (assetId) json.asset_id = assetId;
  const data = await api("/designs", { method: "POST", json });
  return data.design;
}

/** Autofill a brand template; returns the created design summary. */
export async function autofillBrandTemplate({ brandTemplateId, title, data }) {
  const created = await api("/autofills", {
    method: "POST",
    json: {
      type: "create_from_brand_template",
      brand_template_id: brandTemplateId,
      title,
      data,
    },
  });
  const job = await pollJob(`/autofills/${created.job.id}`, (d) => d.job);
  return job.result.design;
}

/** Export a design as PNG; returns an array of download URLs (one per page). */
export async function exportDesignPng({ designId, width, height }) {
  const format = { type: "png" };
  if (width) format.width = width;
  if (height) format.height = height;
  const created = await api("/exports", {
    method: "POST",
    json: { design_id: designId, format },
  });
  const job = await pollJob(`/exports/${created.job.id}`, (d) => d.job);
  return job.urls;
}

/** Download a URL to a local file path. */
export async function download(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download -> ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return destPath;
}
