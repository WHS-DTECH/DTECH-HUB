"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const shared = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const templates = fs.readFileSync(path.join(root, "ProjectPages", "slideshow-template-library.css"), "utf8");

function declarations(source, selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = source.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]+)\\}`));
    assert.ok(match, `Style exists: ${selector}`);
    return Object.fromEntries(match[1].split(";").map((entry) => entry.split(":").map((part) => part.trim()))
        .filter(([key, value]) => key && value));
}

function luminance(hex) {
    assert.match(hex, /^#[0-9a-f]{6}$/i, "Button colours must be opaque and independent of the page background");
    const rgb = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255)
        .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function contrast(foreground, background) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const [source, selector, baseSelector] of [
    [shared, ".button-primary"],
    [shared, ".button-primary:hover", ".button-primary"],
    [shared, ".button-secondary"],
    [shared, ".button-secondary:hover", ".button-secondary"],
    [shared, ".button:disabled"],
    [shared, ".topbar-links a.hub-pathways-link"],
    [shared, ".topbar-links a.hub-pathways-link:hover", ".topbar-links a.hub-pathways-link"],
    [shared, ".modal-button:disabled"],
    [templates, ".template-button-muted"],
    [templates, ".template-button-muted:hover", ".template-button-muted"],
    [templates, ".template-button:disabled"],
    [templates, '.template-card-open[aria-disabled="true"]'],
    [templates, ".template-setup-confirm-button:disabled"]
]) {
    const rule = declarations(source, selector);
    const base = baseSelector ? declarations(source, baseSelector) : {};
    const ratio = contrast(rule.color || base.color, rule.background || base.background);
    assert.ok(ratio >= 4.5, `${selector} must meet WCAG AA normal-text contrast; got ${ratio.toFixed(2)}:1`);
    console.log(`${selector}: ${ratio.toFixed(2)}:1`);
}
assert.equal(declarations(shared, ".button:disabled").opacity, "1", "Disabled labels remain readable");
assert.equal(declarations(templates, ".template-button:disabled").opacity, "1");
const disabledCard = templates.match(/\.template-card-open\[aria-disabled="true"\],\s*\.template-card-open:disabled\s*\{([^}]+)\}/);
assert.ok(disabledCard);
assert.match(disabledCard[1], /color:\s*#4d5974;/, "Later disabled-card rule retains readable text");
assert.match(disabledCard[1], /background:\s*#e8edf7;/);
const focus = declarations(shared, ".button:focus-visible");
assert.match(focus.outline, /3px solid #173858/);
assert.match(focus["box-shadow"], /#ffffff/, "Two-tone focus ring works on light and dark surfaces");
console.log("Shared and slideshow button contrast regressions passed.");
