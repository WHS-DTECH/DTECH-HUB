"use strict";

const { randomUUID } = require("node:crypto");

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
  maxBytes = 25 * 1024 * 1024, maxCacheBytes = 50 * 1024 * 1024, ttlMs = 15 * 60 * 1000 } = {}) {
  const archives = new Map();
  const prune = () => {
    for (const [id, entry] of archives) if (entry.expiresAt <= now()) archives.delete(id);
  };
  return {
    async prepare({ email, activityId, repositoryUrl }) {
      prune();
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
      const response = await fetchArchive(`https://codeload.github.com/${repository.owner}/${repository.repo}/zip/${sha}`, {
        headers: { "User-Agent": "DTECH-HUB" }, redirect: "error", signal: AbortSignal.timeout(90000)
      });
      if (!response.ok || !response.body) throw outcomeError("GitHub could not supply the ZIP. Try again later.", 502);
      if (Number(response.headers.get("content-length")) > maxBytes) {
        await response.body.cancel();
        throw outcomeError("This ZIP exceeds the 25 MB automatic packaging limit.", 413);
      }
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > maxBytes) throw outcomeError("This ZIP exceeds the 25 MB automatic packaging limit.", 413);
          chunks.push(Buffer.from(chunk.value));
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
      const buffer = Buffer.concat(chunks);
      if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) throw outcomeError("GitHub returned an invalid ZIP archive.", 502);
      prune();
      let cacheBytes = Array.from(archives.values()).reduce((total, archive) => total + archive.buffer.length, 0);
      while (archives.size && cacheBytes + size > maxCacheBytes) {
        const oldest = archives.keys().next().value;
        cacheBytes -= archives.get(oldest).buffer.length;
        archives.delete(oldest);
      }
      const snapshot = {
        snapshotId: randomUUID(), repositoryUrl: repository.url, branch, commitSha: sha,
        commitDate: String(commit.commit?.committer?.date || ""),
        fileName: `Final-Outcome-${activityId}-${repository.owner}-${repository.repo}-${sha}.zip`,
        bytes: size, preparedAt: new Date(now()).toISOString(), expiresAt: now() + ttlMs
      };
      archives.set(snapshot.snapshotId, { ...snapshot, email, activityId, buffer });
      return snapshot;
    },
    read(snapshotId, email, activityId) {
      prune();
      const archive = archives.get(String(snapshotId || ""));
      if (!archive || archive.email !== email || archive.activityId !== activityId) {
        throw outcomeError("This ZIP preview has expired. Download the latest ZIP again before saving it.", 410);
      }
      return archive;
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
          limitBytes: 25 * 1024 * 1024, exceedsLimit: bytes > 25 * 1024 * 1024 || (!exact && bytes >= 25 * 1024 * 1024),
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