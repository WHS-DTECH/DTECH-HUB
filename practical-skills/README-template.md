# Practical Skills Module Template

This folder is the reusable Practical Skills module for HUB sites.

## Folder Structure

- `index.html` - Practical Skills homepage (student-facing card library)
- `app.js` - Homepage rendering logic and API calls
- `library.json` - Source-of-truth library card data persisted by admin save
- `admin.html` - Admin management UI for Practical Skills cards
- `admin.js` - Admin add/edit/delete/publish logic

## API Endpoints Used

- `GET /api/practical-skills/library` - Public read for student page
- `GET /api/admin/practical-skills/library` - Admin-only read
- `PUT /api/admin/practical-skills/library` - Admin-only publish/save

## Required Server Config

In `server.js`, ensure this file path constant points to this module folder:

- `PRACTICAL_SKILLS_LIBRARY_FILE = path.join(__dirname, "practical-skills", "library.json")`

## Required Navigation Links

- Global nav Practical Skills item should link to `/practical-skills/`
- Admin menu Practical Skills manager should link to `/practical-skills/admin.html`

## Porting To Another HUB Site

1. Copy the whole `practical-skills/` folder.
2. Copy the 3 Practical Skills API endpoints in `server.js`.
3. Update nav/admin links in the destination site.
4. Keep shared auth helper flow so admin endpoints remain protected.
5. Seed `library.json` with starter cards for the new site.
