"use strict";

function requireDatabaseUrl(value) {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error("DATABASE_URL is required. DTECH-HUB will not start with temporary in-memory storage. Configure PostgreSQL before starting the application.");
    }
    return true;
}

module.exports = { requireDatabaseUrl };
