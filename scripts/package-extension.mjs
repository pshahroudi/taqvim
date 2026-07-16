import { deflateRawSync } from "node:zlib";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = resolve(rootDir, "dist");
const releaseRoots = [
  "manifest.json",
  "README.md",
  "assets",
  "background",
  "options",
  "popup",
  "src"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSafeDistPath() {
  assert(dirname(distDir) === rootDir, "Release dist directory must be inside the project root.");
  assert(basename(distDir) === "dist", "Release output directory must be named dist.");
}

async function collectFiles(path) {
  const absolutePath = resolve(rootDir, path);
  const info = await stat(absolutePath);

  if (info.isFile()) return [absolutePath];

  const entries = await readdir(absolutePath, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => collectFiles(join(path, entry.name)))
  );

  return nested.flat();
}

function toZipPath(absolutePath) {
  return relative(rootDir, absolutePath).split(sep).join("/");
}

function makeCrc32Table() {
  return Array.from({ length: 256 }, (_item, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });
}

const crc32Table = makeCrc32Table();

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = crc32Table[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.path, "utf8");
    const compressed = deflateRawSync(entry.data, { level: 9 });
    const checksum = crc32(entry.data);
    const dos = toDosDateTime(entry.modifiedAt);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(dos.time, 10);
    localHeader.writeUInt16LE(dos.date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(dos.time, 12);
    centralHeader.writeUInt16LE(dos.date, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

async function validateRelease(files, manifest, packageJson) {
  assert(manifest.manifest_version === 3, "Release manifest must use Manifest V3.");
  assert(manifest.version === packageJson.version, "manifest.json and package.json versions differ.");

  const paths = new Set(files.map(toZipPath));
  assert(paths.has("assets/fonts/Vazirmatn.woff2"), "Bundled Vazirmatn font is missing.");
  assert(paths.has("assets/fonts/OFL-Vazirmatn.txt"), "Vazirmatn license is missing.");

  for (const iconPath of Object.values(manifest.icons || {})) {
    assert(paths.has(iconPath), `Manifest icon is missing from release: ${iconPath}`);
  }

  for (const file of files.filter((path) => path.endsWith(".css"))) {
    const css = await readFile(file, "utf8");
    assert(!/https?:\/\//i.test(css), `${toZipPath(file)} contains a remote URL.`);
  }

  const csp = manifest.content_security_policy?.extension_pages || "";
  assert(!/https?:\/\//i.test(csp), "Manifest CSP allows a remote runtime origin.");
}

assertSafeDistPath();
const [manifest, packageJson] = await Promise.all([
  readFile(join(rootDir, "manifest.json"), "utf8").then(JSON.parse),
  readFile(join(rootDir, "package.json"), "utf8").then(JSON.parse)
]);
const files = (await Promise.all(releaseRoots.map(collectFiles))).flat().sort();
await validateRelease(files, manifest, packageJson);

const entries = await Promise.all(
  files.map(async (file) => ({
    path: toZipPath(file),
    data: await readFile(file),
    modifiedAt: (await stat(file)).mtime
  }))
);
const archive = createZip(entries);
const archiveName = `taqvim-${manifest.version}.zip`;

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await writeFile(join(distDir, archiveName), archive);

console.log(`Created dist/${archiveName} (${entries.length} files, ${archive.length} bytes).`);
