"use strict";

const dns = require("node:dns").promises;
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const ipaddr = require("ipaddr.js");
const { parseDocument, DomUtils } = require("htmlparser2");

function failure(status, message) {
    return Object.assign(new Error(message), { status });
}

function validateUrl(value) {
    if (typeof value !== "string" || value.length > 2048) throw failure(400, "Enter a valid public web URL.");
    let url;
    try { url = new URL(value); } catch { throw failure(400, "Enter a valid public web URL."); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
        || (url.port && url.port !== (url.protocol === "https:" ? "443" : "80"))) {
        throw failure(400, "Use a public HTTP(S) URL without credentials or a non-standard port.");
    }
    url.hash = "";
    return url;
}

function isPublicIPv4(address) {
    return net.isIP(address) === 4 && ipaddr.parse(address).range() === "unicast";
}

async function publicAddress(url) {
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(hostname)) {
        if (!isPublicIPv4(hostname)) throw failure(400, "The URL must point to a public website.");
        return hostname;
    }
    let addresses;
    try {
        addresses = await Promise.race([
            dns.lookup(hostname, { all: true, family: 4 }),
            new Promise((_, reject) => {
                const timer = setTimeout(() => reject(failure(504, "The website address lookup timed out.")), 5000);
                timer.unref();
            })
        ]);
    } catch (error) {
        if (error.status) throw error;
        throw failure(502, "Could not resolve the website address.");
    }
    if (!addresses.length || addresses.some(({ address }) => !isPublicIPv4(address))) {
        throw failure(400, "The URL must point to a public website.");
    }
    return addresses[0].address;
}

async function fetchPage(url) {
    const address = await publicAddress(url);
    return new Promise((resolve, reject) => {
        const client = url.protocol === "https:" ? https : http;
        const req = client.request(url, {
            family: 4, lookup: (_host, _options, callback) => callback(null, address, 4),
            headers: { Accept: "text/html, application/xhtml+xml", "User-Agent": "DTECH-HUB-SourceLookup/1.0" },
            timeout: 8000, signal: AbortSignal.timeout(10000)
        }, (res) => {
            const status = res.statusCode || 0;
            if ([301, 302, 303, 307, 308].includes(status)) {
                res.resume();
                return resolve({ redirect: res.headers.location });
            }
            if (status < 200 || status >= 300) {
                res.resume();
                return reject(failure(502, `The website returned HTTP ${status}.`));
            }
            if (!/^text\/html(?:\s*;|$)|^application\/xhtml\+xml(?:\s*;|$)/i.test(res.headers["content-type"] || "")) {
                res.resume();
                return reject(failure(400, "This link does not lead to an HTML webpage. Enter the source details manually."));
            }
            const chunks = [];
            let size = 0;
            res.on("data", (chunk) => {
                size += chunk.length;
                if (size > 512 * 1024) {
                    res.destroy();
                    reject(failure(502, "The webpage is too large to inspect. Enter the source details manually."));
                    return;
                }
                chunks.push(chunk);
            });
            res.on("end", () => resolve({ html: Buffer.concat(chunks).toString("utf8") }));
            res.on("error", () => reject(failure(502, "The website connection was interrupted.")));
        });
        req.on("timeout", () => req.destroy(failure(504, "The website took too long to respond.")));
        req.on("error", (error) => reject(error.status ? error : failure(502, "Could not retrieve this website.")));
        req.end();
    });
}

function parseMetadata(html) {
    const document = parseDocument(html);
    const meta = {};
    for (const tag of DomUtils.getElementsByTagName("meta", document.children, true)) {
        const key = (tag.attribs.property || tag.attribs.name || tag.attribs.itemprop || "").toLowerCase();
        if (key && tag.attribs.content && !meta[key]) meta[key] = tag.attribs.content;
    }
    const titleTag = DomUtils.getElementsByTagName("title", document.children, true, 1)[0];
    const clean = (value, limit) => String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
    const timeTag = DomUtils.getElementsByTagName("time", document.children, true, 1)[0];
    const publishedTag = DomUtils.findOne((node) => node.type === "tag"
        && /(?:^|[-_])publish(?:ed)?[-_]?date(?:$|[-_])/i.test(node.attribs.class || ""), document.children, true);
    const rawDate = clean(meta["article:published_time"] || meta["datepublished"] || meta["publication_date"]
        || meta["citation_publication_date"] || meta["dc.date.issued"] || meta["dc.date"] || meta["date"]
        || timeTag?.attribs.datetime || (publishedTag && DomUtils.textContent(publishedTag)), 100);
    const match = rawDate.match(/^(\d{4}-\d{2})(?:-(\d{2}))?(?:[T\s]|$)/);
    let candidate = match ? `${match[1]}${match[2] ? `-${match[2]}` : ""}` : "";
    const writtenDate = rawDate.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (!candidate && writtenDate) {
        const parsedWritten = new Date(`${writtenDate[2]} ${writtenDate[1]}, ${writtenDate[3]} 00:00:00 GMT`);
        if (Number.isFinite(parsedWritten.valueOf()) && parsedWritten.getUTCDate() === Number(writtenDate[1])) {
            candidate = parsedWritten.toISOString().slice(0, 10);
        }
    }
    const check = candidate.length === 7 ? `${candidate}-01` : candidate;
    const parsed = check ? new Date(`${check}T00:00:00Z`) : null;
    const publicationDate = parsed && Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === check ? candidate : "";
    const pageTitle = clean(titleTag && DomUtils.textContent(titleTag), 500);
    const titlePublisher = pageTitle.match(/\s[-–—|]\s([^|–—]{2,80})$/);
    return {
        title: clean(meta["og:title"] || meta["twitter:title"] || pageTitle, 200),
        author: clean(meta.author || meta["article:author"] || meta["citation_author"] || meta["dc.creator"]
            || meta["og:site_name"] || titlePublisher?.[1], 200),
        publicationDate
    };
}

async function getSourceMetadata(value) {
    let url = validateUrl(value);
    for (let redirects = 0; redirects <= 3; redirects++) {
        const result = await fetchPage(url);
        if (result.html !== undefined) return parseMetadata(result.html);
        if (!result.redirect) throw failure(502, "The website returned an invalid redirect.");
        if (redirects === 3) throw failure(502, "The website redirected too many times.");
        try { url = validateUrl(new URL(result.redirect, url).href); }
        catch (error) {
            if (error.status) throw error;
            throw failure(502, "The website returned an invalid redirect.");
        }
    }
}

module.exports = { getSourceMetadata, parseMetadata, validateUrl, isPublicIPv4 };
