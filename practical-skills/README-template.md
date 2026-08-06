# Practical Skills Module Template

This folder is the reusable Practical Skills module for HUB sites.

## Folder Structure

- `index.html` - Practical Skills homepage (student-facing card library)
- `app.js` - Homepage rendering logic and API calls
- `checklist.html` - Standalone Practical Skills Checklist page
- `checklist.js` - Kit progression and scoreboard logic (local storage)
- `checklist.css` - Checklist page styling
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

## Quick Rebrand Config

Use this checklist when cloning the module to another HUB.

- `Module Route Base`: `/practical-skills/`
- `Student Page`: `practical-skills/index.html`
- `Admin Page`: `practical-skills/admin.html`
- `Data File`: `practical-skills/library.json`
- `Server Constant`: `PRACTICAL_SKILLS_LIBRARY_FILE`
- `Public API`: `GET /api/practical-skills/library`
- `Admin APIs`: `GET /api/admin/practical-skills/library`, `PUT /api/admin/practical-skills/library`
- `Navbar Label`: `Practical Skills`
- `Admin Menu Label`: `Practical Skills Library`
- `Default Card Palette`: `linear-gradient(135deg, #2f8f61 0%, #3ca873 54%, #65c494 100%)`

### Rebrand Targets

Update these files for site-specific naming and visual tweaks:

- `practical-skills/index.html`
- `practical-skills/admin.html`
- `practical-skills/library.json`
- `script.js`
- `admin-menu.html`

## Porting To Another HUB Site

1. Copy the whole `practical-skills/` folder.
2. Copy the 3 Practical Skills API endpoints in `server.js`.
3. Update nav/admin links in the destination site.
4. Keep shared auth helper flow so admin endpoints remain protected.
5. Seed `library.json` with starter cards for the new site.
