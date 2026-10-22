"use strict";

const { randomUUID, createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Readable, Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");

let temporaryFilesChecked = false;

function removeAbandonedOutcomeFiles() {
  if (temporaryFilesChecked) return;
  temporaryFilesChecked = true;
  for (const entry of fs.readdirSync(os.tmpdir(), { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("dtech-hub-outcomes-")) continue;
    const directory = path.join(os.tmpdir(), entry.name);
    const owner = entry.name.match(/^dtech-hub-outcomes-(\d+)-/);
    try {
      if (owner) {
        if (Number(owner[1]) === process.pid) continue;
        try { process.kill(Number(owner[1]), 0); continue; } catch (error) { if (error.code !== "ESRCH") continue; }
      } else if (fs.statSync(directory).mtimeMs > Date.now() - 86400000) continue;
      fs.rmSync(directory, { recursive: true, force: true });
    } catch (_error) {}
  }
}

function outcomeError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function parseOutcomeRepository(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password) return null;
    const match = url.pathname.match(/^\/([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/);
    if (!match || [".", ".."].includes(match[2])) return null;
    return { owner: match[1], repo: match[2], url: `https://github.com/${match[1]}/${match[2]}` };
  } catch (_error) {
    return null;
  }
}

function outcomeRepositories(evidence) {
  const found = new Map();
  (Array.isArray(evidence) ? evidence : []).forEach((row) => {
    (Array.isArray(row?.steps) ? row.steps : []).forEach((step) => {
      const text = String(step?.text || "").trim();
      if (!text.startsWith("GITHUB_REPO_URL|")) return;
      const repository = parseOutcomeRepository(text.slice("GITHUB_REPO_URL|".length).trim());
      if (repository) found.set(repository.url.toLowerCase(), repository);
    });
  });
  return Array.from(found.values());
}

function createOutcomeArchiveStore({ githubApiRequest, fetchArchive = fetch, now = Date.now,
  maxBytes = 512 * 1024 * 1024, maxCacheBytes = 1024 * 1024 * 1024, ttlMs = 60 * 60 * 1000 } = {}) {
  const archives = new Map();
  removeAbandonedOutcomeFiles();
  let directory = "";
  let preparing = false;
  let closed = false;
  const remove = (id, archive) => {
    if (archive.users) return;
    fs.rmSync(archive.filePath, { force: true });
    archives.delete(id);
  };
  const prune = () => {
    for (const [id, entry] of archives) if (closed || entry.expiresAt <= now()) remove(id, entry);
    if (!archives.size && !preparing && directory) {
      fs.rmSync(directory, { recursive: true, force: true });
      directory = "";
    }
  };
  const timer = setInterval(() => { try { prune(); } catch (_error) {} }, 60000);
  timer.unref();
  return {
    async prepare({ email, activityId, repositoryUrl, streamSource = null }) {
      if (closed || preparing) throw outcomeError("The ZIP service is busy. Please retry shortly.", 503);
      prune();
      preparing = true;
      let partialPath = "";
      let filePath = "";
      try {
      let details;
      let response;
      if (streamSource) {
        details = streamSource.metadata;
        response = await streamSource.open();
      } else {
      const repository = parseOutcomeRepository(repositoryUrl);
      if (!repository) throw outcomeError("Select a saved GitHub repository.");
      const base = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
      const metadata = await githubApiRequest(base);
      if (metadata.private !== false) throw outcomeError("Automatic ZIP packaging currently supports public repositories only.");
      const branch = String(metadata.default_branch || "");
      if (!branch) throw outcomeError("This repository has no default branch yet.");
      const commit = await githubApiRequest(`${base}/commits/${encodeURIComponent(branch)}`);
      const sha = String(commit.sha || "");
      if (!/^[a-f0-9]{40}$/i.test(sha)) throw outcomeError("GitHub did not return a valid commit.", 502);
      const tree = await githubApiRequest(`${base}/git/trees/${sha}`, { recursive: "1" });
      if (tree.truncated || !Array.isArray(tree.tree)) throw outcomeError("This repository is too large to verify automatically.");
      if (tree.tree.some((item) => item.mode === "160000" || item.type === "commit")) {
        throw outcomeError("This repository uses submodules. Package the complete outcome manually; GitHub ZIPs omit submodule files.");
      }
      const attributes = tree.tree.filter((item) => /(?:^|\/)\.gitattributes$/.test(item.path || ""));
      if (attributes.length > 20) throw outcomeError("This repository has too many archive rules to verify automatically.");
      for (const file of attributes) {
        if (!/^[a-f0-9]{40}$/i.test(String(file.sha || "")) || file.size > 65536) throw outcomeError("Could not verify the repository's archive rules.");
        const blob = await githubApiRequest(`${base}/git/blobs/${file.sha}`);
        if (blob.encoding !== "base64") throw outcomeError("Could not verify the repository's archive rules.");
        const rules = Buffer.from(blob.content || "", "base64").toString("utf8");
        if (rules.split(/\r?\n/).some((line) => !/^\s*#/.test(line) && /filter\s*=\s*lfs|\bexport-ignore\b/.test(line))) {
          throw outcomeError("This repository uses Git LFS or export exclusions. Package the complete outcome manually to avoid missing files.");
        }
      }
      response = await fetchArchive(`https://codeload.github.com/${repository.owner}/${repository.repo}/zip/${sha}`, {
        headers: { "User-Agent": "DTECH-HUB" }, redirect: "error", signal: AbortSignal.timeout(300000)
      });
      details = { repositoryUrl: repository.url, branch, commitSha: sha,
        commitDate: String(commit.commit?.committer?.date || ""),
        fileName: `Final-Outcome-${activityId}-${repository.owner}-${repository.repo}-${sha}.zip` };
      }
      if (!response.ok || !response.body) throw outcomeError("GitHub could not supply the ZIP. Try again later.", 502);
      const expectedBytes = Number(response.headers.get("content-length")) || 0;
      if (expectedBytes > maxBytes) {
        await response.body.cancel();
        throw outcomeError("This repository is too large for automatic packaging. Ask your teacher for help.", 413);
      }
      let cacheBytes = Array.from(archives.values()).reduce((total, archive) => total + archive.bytes, 0);
      const reservation = Math.min(expectedBytes || maxBytes, maxBytes);
      for (const [id, archive] of archives) {
        if (cacheBytes + reservation <= maxCacheBytes) break;
        if (archive.users) continue;
        cacheBytes -= archive.bytes;
        remove(id, archive);
      }
      if (cacheBytes + reservation > maxCacheBytes) {
        await response.body.cancel();
        throw outcomeError("Temporary ZIP storage is busy. Please retry after other downloads finish.", 503);
      }
      if (!directory) directory = fs.mkdtempSync(path.join(os.tmpdir(), `dtech-hub-outcomes-${process.pid}-`));
      const snapshotId = randomUUID();
      filePath = path.join(directory, `${snapshotId}.zip`);
      partialPath = `${filePath}.part`;
      let size = 0;
      let signature = Buffer.alloc(0);
      const checksum = createHash("md5");
      const counter = new Transform({ transform(chunk, _encoding, callback) {
        size += chunk.length;
        if (size > maxBytes) { callback(outcomeError("This repository is too large for automatic packaging. Ask your teacher for help.", 413)); return; }
        if (cacheBytes + size > maxCacheBytes) { callback(outcomeError("Temporary ZIP storage is busy. Please retry shortly.", 503)); return; }
        if (signature.length < 4) signature = Buffer.concat([signature, chunk.subarray(0, 4 - signature.length)]);
        checksum.update(chunk);
        callback(null, chunk);
      } });
      await pipeline(Readable.fromWeb(response.body), counter, fs.createWriteStream(partialPath, { flags: "wx", mode: 0o600 }));
      if (signature.length < 4 || signature.readUInt32LE(0) !== 0x04034b50) throw outcomeError("GitHub returned an invalid ZIP archive.", 502);
      if (expectedBytes && expectedBytes !== size) throw outcomeError("GitHub's ZIP transfer was incomplete. Try again.", 502);
      await fs.promises.rename(partialPath, filePath);
      const snapshot = {
        ...details, snapshotId,
        bytes: size, preparedAt: new Date(now()).toISOString(), expiresAt: now() + ttlMs
      };
      archives.set(snapshot.snapshotId, { ...snapshot, email, activityId, filePath, md5Checksum: checksum.digest("hex"), users: 0 });
      return snapshot;
      } catch (error) {
        if (partialPath) fs.rmSync(partialPath, { force: true });
        if (filePath) fs.rmSync(filePath, { force: true });
        if (error.code === "ENOSPC") throw outcomeError("Temporary storage is full. Please retry later.", 503);
        throw error;
      } finally {
        preparing = false;
        prune();
      }
    },
    prepareStream({ email, activityId, metadata, open }) {
      return this.prepare({ email, activityId, streamSource: { metadata, open } });
    },
    discard(snapshotId, email, activityId) {
      const archive = this.read(snapshotId, email, activityId);
      archive.expiresAt = 0;
      prune();
    },
    read(snapshotId, email, activityId) {
      prune();
      const archive = archives.get(String(snapshotId || ""));
      if (!archive || archive.expiresAt <= now() || archive.email !== email || archive.activityId !== activityId || !fs.existsSync(archive.filePath)) {
        throw outcomeError("This ZIP preview has expired. Download the latest ZIP again before saving it.", 410);
      }
      return archive;
    },
    acquire(snapshotId, email, activityId) {
      const archive = this.read(snapshotId, email, activityId);
      archive.users += 1;
      let released = false;
      return { archive, release() { if (!released) { released = true; archive.users -= 1; prune(); } } };
    },
    close() {
      closed = true;
      clearInterval(timer);
      prune();
    }
  };
}

function createGithubZipSizeReader({ githubApiRequest, fetchArchive = fetch, now = Date.now,
  maxBytes = 200 * 1024 * 1024, ttlMs = 300000, maxEntries = 128 } = {}) {
  const measured = new Map();
  const pending = new Map();
  return {
    async measure(repositoryUrl) {
      const repository = parseOutcomeRepository(repositoryUrl);
      if (!repository) throw outcomeError("Select a saved GitHub repository.");
      const base = `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
      const metadata = await githubApiRequest(base);
      if (metadata.private !== false) throw outcomeError("ZIP size checks currently support public repositories only.");
      const branch = String(metadata.default_branch || "");
      if (!branch) throw outcomeError("This repository has no default branch yet.");
      const commit = await githubApiRequest(`${base}/commits/${encodeURIComponent(branch)}`);
      const commitSha = String(commit.sha || "");
      if (!/^[a-f0-9]{40}$/i.test(commitSha)) throw outcomeError("GitHub did not return a valid commit.", 502);
      const key = `${repository.url.toLowerCase()}:${commitSha}`;
      for (const [id, value] of measured) if (value.expiresAt <= now()) measured.delete(id);
      if (measured.has(key)) return measured.get(key).value;
      if (pending.has(key)) return pending.get(key);
      const request = (async () => {
        const response = await fetchArchive(`https://codeload.github.com/${repository.owner}/${repository.repo}/zip/${commitSha}`, {
          headers: { "User-Agent": "DTECH-HUB" }, redirect: "error", signal: AbortSignal.timeout(120000)
        });
        if (!response.ok || !response.body) throw outcomeError("GitHub could not supply the ZIP size. Try Sync from GitHub again later.", 502);
        const reader = response.body.getReader();
        let bytes = 0;
        let signature = Buffer.alloc(0);
        let exact = true;
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            bytes += chunk.value.byteLength;
            if (signature.length < 4) signature = Buffer.concat([signature, Buffer.from(chunk.value).subarray(0, 4 - signature.length)]);
            if (bytes > maxBytes) { bytes = maxBytes; exact = false; break; }
          }
        } finally {
          await reader.cancel().catch(() => {});
        }
        if (signature.length < 4 || signature.readUInt32LE(0) !== 0x04034b50) throw outcomeError("GitHub returned an invalid ZIP archive.", 502);
        const value = {
          repositoryUrl: repository.url, branch, commitSha, bytes, exact,
          limitBytes: 512 * 1024 * 1024, exceedsLimit: exact ? bytes > 512 * 1024 * 1024 : bytes >= 512 * 1024 * 1024 ? true : null,
          measuredAt: new Date(now()).toISOString()
        };
        while (measured.size >= maxEntries) measured.delete(measured.keys().next().value);
        measured.set(key, { value, expiresAt: now() + ttlMs });
        return value;
      })();
      pending.set(key, request);
      try {
        return await request;
      } finally {
        pending.delete(key);
      }
    }
  };
}

module.exports = { parseOutcomeRepository, outcomeRepositories, createOutcomeArchiveStore, createGithubZipSizeReader };