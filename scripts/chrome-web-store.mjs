// Chrome Web Store API v2 client for the release workflow.
//
//   node scripts/chrome-web-store.mjs status
//   node scripts/chrome-web-store.mjs publish dist/taqvim-<version>.zip
//
// Needs CWS_ACCESS_TOKEN (an OAuth token with the chromewebstore scope) and
// CWS_PUBLISHER_ID. In CI the token comes from Workload Identity Federation;
// locally, from `gcloud auth print-access-token --impersonate-service-account`.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const apiBase = "https://chromewebstore.googleapis.com";
const itemId = process.env.CWS_ITEM_ID || "chfmbjcjehmdkcgfmfpdhmipgfaljlbi";
const uploadPollSeconds = 5;
const uploadPollAttempts = 24;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function itemPath() {
  const publisherId = process.env.CWS_PUBLISHER_ID;
  assert(publisherId, "CWS_PUBLISHER_ID is not set.");
  return `publishers/${publisherId}/items/${itemId}`;
}

async function request(method, url, body, contentType = "application/json") {
  const token = process.env.CWS_ACCESS_TOKEN;
  assert(token, "CWS_ACCESS_TOKEN is not set.");

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": contentType })
    },
    body
  });
  const text = await response.text();
  assert(response.ok, `${method} ${url} failed with ${response.status}:\n${text}`);
  return text ? JSON.parse(text) : {};
}

function fetchStatus() {
  return request("GET", `${apiBase}/v2/${itemPath()}:fetchStatus`);
}

function describeRevision(label, revision) {
  if (!revision) return `${label}: none`;
  const versions = (revision.distributionChannels || [])
    .map((channel) => `${channel.crxVersion} at ${channel.deployPercentage}%`)
    .join(", ");
  return `${label}: ${revision.state}${versions ? ` (${versions})` : ""}`;
}

function printStatus(status) {
  console.log(describeRevision("Published", status.publishedItemRevisionStatus));
  console.log(describeRevision("Submitted", status.submittedItemRevisionStatus));
  if (status.lastAsyncUploadState) console.log(`Last upload: ${status.lastAsyncUploadState}`);
  if (status.warned) console.log("WARNING: the item has a policy warning; see the developer dashboard.");
  if (status.takenDown) console.log("WARNING: the item has been taken down; see the developer dashboard.");
}

async function waitForUpload() {
  for (let attempt = 1; attempt <= uploadPollAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, uploadPollSeconds * 1000));
    const state = (await fetchStatus()).lastAsyncUploadState;
    console.log(`Upload state: ${state}`);
    if (state !== "IN_PROGRESS") return state;
  }
  throw new Error(`Upload still in progress after ${uploadPollSeconds * uploadPollAttempts} s.`);
}

async function publish(zipPath) {
  assert(zipPath, "Usage: node scripts/chrome-web-store.mjs publish <zip>");
  const manifest = JSON.parse(await readFile(join(rootDir, "manifest.json"), "utf8"));
  const archive = await readFile(zipPath);

  const before = await fetchStatus();
  printStatus(before);
  assert(
    before.submittedItemRevisionStatus?.state !== "PENDING_REVIEW",
    "A submission is already pending review; cancel it in the dashboard or wait for the verdict."
  );

  console.log(`Uploading ${zipPath} (${archive.length} bytes) to ${itemId}.`);
  const upload = await request(
    "POST",
    `${apiBase}/upload/v2/${itemPath()}:upload?uploadType=media`,
    archive,
    "application/zip"
  );
  let uploadState = upload.uploadState;
  console.log(`Upload state: ${uploadState}`);
  if (uploadState === "IN_PROGRESS") uploadState = await waitForUpload();
  assert(uploadState === "SUCCEEDED", `Upload ended in state ${uploadState}.`);
  if (upload.crxVersion) {
    assert(
      upload.crxVersion === manifest.version,
      `Store read version ${upload.crxVersion}, manifest says ${manifest.version}.`
    );
  }

  const result = await request(
    "POST",
    `${apiBase}/v2/${itemPath()}:publish`,
    JSON.stringify({ publishType: "DEFAULT_PUBLISH" })
  );
  console.log(`Submitted ${manifest.version}: ${result.state}`);
  if (result.warningInfo) console.log(`Warnings: ${JSON.stringify(result.warningInfo)}`);
  assert(
    ["PENDING_REVIEW", "STAGED", "PUBLISHED"].includes(result.state),
    `Unexpected submission state ${result.state}.`
  );
}

const [command, argument] = process.argv.slice(2);

if (command === "status") {
  printStatus(await fetchStatus());
} else if (command === "publish") {
  await publish(argument);
} else {
  throw new Error("Usage: node scripts/chrome-web-store.mjs status | publish <zip>");
}
