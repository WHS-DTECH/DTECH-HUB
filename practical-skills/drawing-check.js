"use strict";

const POLICY = "google-drawing-shapes-v1";
const MIN_FILLED_SHAPES = 8;
const MAX_SVG_CHARACTERS = 5 * 1024 * 1024;

function attributes(source) {
    const values = {};
    for (const match of String(source).matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
        values[match[1].toLowerCase()] = match[2] ?? match[3] ?? "";
    }
    for (const declaration of String(values.style || "").split(";")) {
        const [name, ...rest] = declaration.split(":");
        if (name?.trim() && rest.length) values[name.trim().toLowerCase()] = rest.join(":").trim();
    }
    return values;
}

function visible(value, opacity, overall) {
    const paint = String(value || "").trim().toLowerCase();
    const amount = (input) => input === undefined || input === "" ? 1 : Number(input);
    return Boolean(paint) && paint !== "none" && paint !== "transparent" &&
        amount(opacity) > 0 && amount(overall) > 0;
}

function checkGoogleDrawingSvg(svg) {
    const text = String(svg || "");
    if (text.length > MAX_SVG_CHARACTERS) {
        throw Object.assign(new Error("This drawing is too large for automatic checking. Ask your teacher to review it."), { status: 422 });
    }
    if (!/<svg[\s>]/i.test(text)) {
        throw Object.assign(new Error("The drawing could not be read. Check that you submitted a Google Drawing, or ask your teacher to review it."), { status: 422 });
    }
    const drawn = text.replace(/<(defs|clipPath|mask|pattern|symbol)\b[\s\S]*?<\/\1\s*>/gi, "");
    const images = (drawn.match(/<image\b/gi) || []).length;
    let filledShapes = 0;
    let outlineOnly = 0;
    for (const match of drawn.matchAll(/<(path|rect|circle|ellipse|polygon|polyline|line)\b([^>]*)>/gi)) {
        const values = attributes(match[2]);
        if (match[1].toLowerCase() !== "line" && visible(values.fill, values["fill-opacity"], values.opacity)) filledShapes += 1;
        else if (visible(values.stroke, values["stroke-opacity"], values.opacity)) outlineOnly += 1;
    }
    const passed = images === 0 && filledShapes >= MIN_FILLED_SHAPES;
    return {
        passed, filledShapes, outlineOnly, images, minimumFilledShapes: MIN_FILLED_SHAPES,
        message: passed
            ? `Drawing check passed: ${filledShapes} filled shapes and no inserted pictures. This does not judge visual similarity; your teacher may review it.`
            : images
                ? "Remove inserted or pasted pictures. Build the drawing from your own Insert > Shape objects, then check again."
                : `Found ${filledShapes} filled shape${filledShapes === 1 ? "" : "s"}; at least ${MIN_FILLED_SHAPES} are needed. Use Insert > Shape with fill colours, not only lines, then check again.`
    };
}

module.exports = { POLICY, MIN_FILLED_SHAPES, checkGoogleDrawingSvg };
