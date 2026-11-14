# Thet Site Studio — Phase 1 + Phase 2 (local prototype)

The original Halloween landing page is preserved in `index.html` (including its embedded images, dependencies and original layout). Studio functionality is in `studio.css` and `studio.js`.

## Open the editor

- Public site: https://thythet.com/account/
- **Local studio:** https://thythet.com/account/?studio=1
- The editor opens on the right. Close it to inspect the page; use **✦ Studio** to reopen.
- This is **not a protected admin URL**. Anyone can open the editor on their own device; edits are **not published to other visitors**. Do not put private data into it.

## Phase 1/2 features

- Seven themes (Original, Midnight, Ocean, Forest, Rose, Amber, Minimal) and a custom hex accent.
- Branding fields (site name and an editable tagline/note).
- In-place editable text within the original page, including headings, descriptions and buttons.
- Click an image to replace its displayed URL.
- Show/hide and move original sections, add text, cards, product and gallery sections.
- Autosave field edits on blur, with a manual **Save draft** action.
- Local persistence in the same browser's `localStorage`.
- Download a JSON draft and import that JSON later; reset local drafts.

## Known limitations

- These are local drafts only. A draft is visible only on the same browser while using `?studio=1`; public visitors continue to see the original live design. There is no cloud publishing button.
- No Firebase authentication, database, roles, Cloudinary upload signing, backend, or server-side publishing has been configured.
- The tagline field is reserved metadata; it is not yet rendered into the original template.
- The gallery uses neutral placeholder elements until images are added. It is a section scaffold, not a finished store/product management backend.
- Local storage is size-limited and device-specific. Prefer remotely hosted image URLs and export backups. Avoid data URLs for large photos.
- Content editing currently uses plaintext even for some rich HTML headings; changing a heading can flatten its internal HTML structure (such as line breaks). The original source remains intact.
- Section order changes are scoped to top-level original DOM sections. Not all site components are individually modular yet.
- Imported JSON is a **local draft** and should be handled as untrusted user content. It cannot grant admin access.

## Next implementation stages

**Phase 3:** secure Firebase config wizard; Google sign-in; explicit owner bootstrap; Firebase Security Rules and role-based access; public/published and draft data separation; protected publishing and revision history.

**Phase 4:** Cloudinary upload signing via protected backend; images, videos and file library; rich product/post data models; image cleanup and reusable media.

**Phase 5:** vetted module registry; apps directory, configurable custom fields, reusable templates and extension APIs.

**Phase 6:** production security, accessibility and compatibility tests, browser automation, robust import/export, deployment verification and handoff.

## Source attribution

Customized by thythet.com. The starting template/design includes Bedimcode assets; retain applicable original licensing/attribution and review permission before redistribution.

## Scope

Only files inside `account/` should be modified for these phases. No Firebase data or live security rules have been changed.
