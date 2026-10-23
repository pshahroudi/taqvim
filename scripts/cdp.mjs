// Headless Chrome over --remote-debugging-pipe, shared by the store-asset
// capture and the browser test. No dependencies: CDP messages are JSON
// separated by NUL bytes on file descriptors 3 (commands) and 4 (replies).
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

export function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : null,
    process.platform === "win32"
      ? "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
      : null,
    process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : null,
    process.platform === "linux" ? "/usr/bin/google-chrome" : null,
    process.platform === "linux" ? "/usr/bin/google-chrome-stable" : null,
    process.platform === "linux" ? "/usr/bin/chromium" : null,
  ].filter(Boolean);

  const chromePath = candidates.find(existsSync);
  if (!chromePath) {
    throw new Error("Google Chrome was not found. Set CHROME_PATH and retry.");
  }

  return chromePath;
}

export function delay(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

export class PipeCdpClient {
  constructor(child) {
    this.child = child;
    this.commandPipe = child.stdio[3];
    this.eventPipe = child.stdio[4];
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    this.buffer = Buffer.alloc(0);

    this.eventPipe.on("data", (chunk) => this.handleData(chunk));
    this.eventPipe.on("error", (error) => this.rejectAll(error));
    child.on("exit", (code) => {
      if (this.pending.size > 0) {
        this.rejectAll(new Error(`Chrome exited early with code ${code}.`));
      }
    });
  }

  // listener({ method, params, sessionId }) for every CDP event.
  onEvent(listener) {
    this.listeners.add(listener);
  }

  handleData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const separatorIndex = this.buffer.indexOf(0);
      if (separatorIndex === -1) return;

      const messageBuffer = this.buffer.subarray(0, separatorIndex);
      this.buffer = this.buffer.subarray(separatorIndex + 1);
      if (messageBuffer.length === 0) continue;

      const message = JSON.parse(messageBuffer.toString("utf8"));
      if (!message.id) {
        for (const listener of this.listeners) listener(message);
        continue;
      }

      const pending = this.pending.get(message.id);
      if (!pending) continue;

      clearTimeout(pending.timeout);
      this.pending.delete(message.id);

      if (message.error) {
        pending.reject(
          new Error(`${pending.method}: ${message.error.message || "CDP command failed"}`),
        );
      } else {
        pending.resolve(message.result || {});
      }
    }
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId;
    this.nextId += 1;

    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;

    return new Promise((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out.`));
      }, 15_000);

      this.pending.set(id, {
        method,
        resolve: resolvePromise,
        reject,
        timeout,
      });
      this.commandPipe.write(`${JSON.stringify(payload)}\0`);
    });
  }
}

export async function launchChrome(profileDir, extraArgs = []) {
  const child = spawn(
    findChrome(),
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-default-apps",
      "--no-first-run",
      "--remote-debugging-pipe",
      `--user-data-dir=${profileDir}`,
      ...extraArgs,
      "about:blank",
    ],
    {
      stdio: ["ignore", "ignore", "inherit", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  const client = new PipeCdpClient(child);

  async function close() {
    await client.send("Browser.close").catch(() => child.kill());
    await new Promise((resolvePromise) => {
      if (child.exitCode !== null) {
        resolvePromise();
        return;
      }
      child.once("exit", resolvePromise);
      setTimeout(() => {
        child.kill();
        resolvePromise();
      }, 5_000);
    });
  }

  return { child, client, close };
}
