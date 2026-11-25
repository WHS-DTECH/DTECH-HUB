# Security vulnerability notices

Open **Admin Menu > Security Vulnerability Notices** to create and update the
persistent advisory register. Read, write and original-image access require a
verified school Google identity and a server-resolved Admin role; client-supplied
email and role hints do not authorize access. No database means an explicit error,
not temporary storage.

Each notice records its source, received date, severity, status, remediation and
verification evidence. Updates retain previous versions and the acting Admin.
Concurrent edits must reload rather than overwrite a newer version. Closing a
notice requires verification evidence. Evidence is an Admin assertion, not an
automated runtime certification.

## Initial Render notice

The supplied Image 1 is retained behind the authenticated evidence endpoint.
Its transcription is seeded once into PostgreSQL when the register is first used;
later deployments do not overwrite Admin updates.

- Reference: [CVE-2026-125396](https://nvd.nist.gov/vuln/detail/CVE-2026-125396).
- NVD reports HIGH severity (CVSS 4.0 8.5), affecting Ghostscript before 10.08.0.
- Render's notice requires a successful native-runtime deployment after
  **20 November 2026, 20:00 UTC**. Docker/bundled copies must be updated separately.
- The repository declares a native Node runtime, with no identified application
  use of Ghostscript, ImageMagick or Pillow. This is not a system-package audit.
- Initial status is **Verification required**, not Resolved. Check the service's
  actual Render runtime, successful deploy time and Ghostscript version/vendor
  patch evidence before closing it. Never paste credentials into this register.

Run focused checks with `node --test scripts/regression-security-notices.js`.
