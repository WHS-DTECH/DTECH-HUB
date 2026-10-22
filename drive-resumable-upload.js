"use strict";

const fs = require("node:fs/promises");

function uploadError(message, status = 502) {
  return Object.assign(new Error(message), { status });
}

function createDriveResumableUploader({ fetchRequest = fetch, chunkBytes = 8 * 1024 * 1024, now = Date.now, ttlMs = 3600000 } = {}) {
  if (chunkBytes < 262144 || chunkBytes % 262144) throw new Error("Drive upload chunks must be multiples of 256 KiB.");
  const sessions = new Map();
  const keyFor = ({ folderId, fileName, md5Checksum }) => `${folderId}:${fileName}:${md5Checksum}`;
  const prune = () => { for (const [key, session] of sessions) if (session.expiresAt <= now()) sessions.delete(key); };
  return {
    hasSession(options) { prune(); return sessions.has(keyFor(options)); },
    async upload(options) {
      prune();
      const { accessToken, folderId, fileName, filePath, bytes, md5Checksum, mimeType = "application/zip" } = options;
      const key = keyFor(options);
      const file = await fs.open(filePath, "r");
      try {
        if ((await file.stat()).size !== bytes) throw uploadError("The prepared ZIP is incomplete. Download the latest ZIP again.", 409);
        let session = sessions.get(key);
        const headers = { Authorization: `Bearer ${accessToken}` };
        const finish = async (response) => {
          let result = await response.json().catch(() => ({}));
          if (!/^[A-Za-z0-9_-]+$/.test(String(result.id || ""))) throw uploadError("Google Drive did not return a saved file ID. Retry Google Drive save.");
          if (result.size === undefined || !result.md5Checksum) {
            const metadata = await fetchRequest(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(result.id)}?fields=id,name,size,md5Checksum`, {
              headers, redirect: "error", signal: AbortSignal.timeout(30000)
            });
            if (!metadata.ok) throw uploadError("Could not verify the uploaded ZIP. Retry Google Drive save.");
            result = await metadata.json();
          }
          if (Number(result.size) !== bytes || result.md5Checksum !== md5Checksum) throw uploadError("The saved ZIP did not match the prepared file. No completion was recorded.");
          sessions.delete(key);
          return result;
        };
        const interpret = async (response) => {
          if (response.status === 200 || response.status === 201) return finish(response);
          if (response.status === 308) {
            const range = response.headers.get("range");
            if (range && !/^bytes=0-\d+$/.test(range)) throw uploadError("Google returned an invalid upload offset.");
            const offset = range ? Number(range.slice(8)) + 1 : 0;
            if (!Number.isSafeInteger(offset) || offset < 0 || offset > bytes) throw uploadError("Google returned an invalid upload offset.");
            session.offset = offset;
            return null;
          }
          if (response.status === 404 || response.status === 410) {
            sessions.delete(key);
            throw uploadError("The Drive upload session ended. Retry Google Drive save to recover or restart it.");
          }
          if (response.status === 401 || response.status === 403) throw uploadError("Google Drive permission is required. Retry Google Drive save.", response.status);
          throw uploadError("Google Drive upload was interrupted. Retry Google Drive save to continue the same ZIP.");
        };
        const probe = async () => {
          const response = await fetchRequest(session.url, {
            method: "PUT", headers: { ...headers, "Content-Range": `bytes */${bytes}` }, body: Buffer.alloc(0),
            redirect: "error", signal: AbortSignal.timeout(30000)
          }).catch(() => { throw uploadError("Could not resume the Drive upload. Retry Google Drive save."); });
          return interpret(response);
        };
        if (session) {
          const completed = await probe();
          if (completed) return completed;
        } else {
          const response = await fetchRequest("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,md5Checksum,webViewLink", {
            method: "POST", headers: { ...headers, "Content-Type": "application/json", "X-Upload-Content-Type": mimeType, "X-Upload-Content-Length": String(bytes) },
            body: JSON.stringify({ name: fileName, parents: [folderId] }), redirect: "error", signal: AbortSignal.timeout(30000)
          });
          if (!response.ok) throw uploadError("Could not start the Google Drive upload. Allow Drive access and retry.", response.status === 401 || response.status === 403 ? response.status : 502);
          let url;
          try { url = new URL(response.headers.get("location")); } catch (_error) { throw uploadError("Google Drive did not return an upload session."); }
          if (url.protocol !== "https:" || url.hostname !== "www.googleapis.com" || url.username || url.password || url.port
            || url.pathname !== "/upload/drive/v3/files") throw uploadError("Google Drive returned an invalid upload session.");
          while (sessions.size >= 64) sessions.delete(sessions.keys().next().value);
          session = { url: url.href, offset: 0, expiresAt: now() + ttlMs };
          sessions.set(key, session);
        }
        const buffer = Buffer.alloc(Math.min(chunkBytes, bytes));
        let recoveries = 0;
        while (true) {
          if (session.offset >= bytes) {
            const completed = await probe();
            if (completed) return completed;
            if (++recoveries > 2) throw uploadError("Drive has not confirmed the upload. Retry Google Drive save.");
            continue;
          }
          const offset = session.offset;
          const length = Math.min(chunkBytes, bytes - offset);
          let filled = 0;
          while (filled < length) {
            const result = await file.read(buffer, filled, length - filled, offset + filled);
            if (!result.bytesRead) throw uploadError("The prepared ZIP was truncated. Download the latest ZIP again.", 409);
            filled += result.bytesRead;
          }
          let response;
          try {
            response = await fetchRequest(session.url, {
              method: "PUT", headers: { ...headers, "Content-Type": mimeType, "Content-Range": `bytes ${offset}-${offset + length - 1}/${bytes}` },
              body: buffer.subarray(0, length), redirect: "error", signal: AbortSignal.timeout(120000)
            });
          } catch (_error) {
            if (++recoveries > 2) throw uploadError("Drive upload was interrupted. Retry Google Drive save to resume.");
            const completed = await probe();
            if (completed) return completed;
            continue;
          }
          if (response.status === 429 || response.status >= 500) {
            if (++recoveries > 2) throw uploadError("Drive is temporarily unavailable. Retry Google Drive save to resume.");
            const completed = await probe();
            if (completed) return completed;
            continue;
          }
          const completed = await interpret(response);
          if (completed) return completed;
          session.expiresAt = now() + ttlMs;
          if (session.offset <= offset) {
            if (++recoveries > 2) throw uploadError("Drive upload made no progress. Retry Google Drive save.");
          } else recoveries = 0;
        }
      } finally {
        await file.close();
      }
    }
  };
}

module.exports = { createDriveResumableUploader };