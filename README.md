# ACC Student Document Request System
Laravel (REST API + Sanctum) + React (Vite, Tailwind) + MySQL

Folder layout of this package:
```
acc-document-request-system/
├── backend-overlay/   <- ACC code that is copied ON TOP of a fresh Laravel install
│   ├── app/ (Models, Policies, Middleware, Http/Controllers/Api, Requests, Resources)
│   ├── bootstrap/app.php
│   ├── database/ (migrations, seeders)
│   └── routes/api.php
└── frontend/          <- React app (Vite)
```

## Requirements
PHP 8.2+, Composer 2, Node.js 18+ (npm), MySQL 8 / MariaDB (XAMPP or Laragon works).
PHP extensions: pdo_mysql, mbstring, openssl, fileinfo, ctype, json, tokenizer, xml.

## STEP 1 — Create the database
Start MySQL, then in phpMyAdmin or the MySQL console:
```sql
CREATE DATABASE acc_documents CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## STEP 2 — Create the Laravel backend
Run this inside the `acc-document-request-system` folder:
```bash
composer create-project laravel/laravel backend
cd backend
php artisan install:api        # installs Sanctum + routes/api.php (answer "no" if asked to run migrations)
```

## STEP 3 — Copy the ACC code into Laravel
From inside `backend/`:

macOS / Linux / Git Bash:
```bash
cp -r ../backend-overlay/* .
```
Windows (CMD):
```bat
xcopy ..\backend-overlay\* . /E /Y
```
(Say "yes" to overwrite `bootstrap/app.php`, `routes/api.php`, and `app/Models/User.php`.)

## STEP 4 — Configure `.env`
Open `backend/.env` and set:
```
APP_URL=http://127.0.0.1:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=acc_documents
DB_USERNAME=root
DB_PASSWORD=
```
(Use your own MySQL username/password. Leave `SESSION_DRIVER`/`CACHE_STORE` as they are; if you get a
"table not found" error for sessions or cache, run migrations first as in Step 5.)

## STEP 5 — Migrate, seed, and link storage
```bash
php artisan migrate:fresh --seed
php artisan storage:link
php artisan serve              # API runs on http://127.0.0.1:8000
```
Leave this terminal open.

## STEP 6 — Run the React frontend
Open a SECOND terminal:
```bash
cd frontend
npm install
npm run dev                    # opens http://localhost:5173
```
The Vite dev server proxies `/api` and `/storage` to Laravel, so no CORS setup is needed during development.

Open **http://localhost:5173**.

## Test credentials
There are only two roles: **Admin** and **Student** (the "user").

| Role    | Login (email or Student ID)         | Password       |
|---------|-------------------------------------|----------------|
| Admin   | admin@acc.edu.ph                    | Admin@12345    |
| Student | juan@student.acc.edu.ph (2023-0001) | Student@12345  |
| Student | ana@student.acc.edu.ph (2022-0042)  | Student@12345  |
| Student | pedro@student.acc.edu.ph (2024-0107)| Student@12345  |

> **Upgrading an existing install (profile pictures + payment tracking)?** Copy `backend-overlay/*` over your `backend/` folder
> again, then run `php artisan migrate` (adds `users.profile_photo_path` and the `payment_*` tracking columns; no data is lost).
> Make sure `php artisan storage:link` has been run, otherwise uploaded pictures will not show.
> Fresh install? `php artisan migrate:fresh --seed` already includes everything.

> Upgrading from the very old version? Run `php artisan migrate:fresh --seed` again. The database layout changed
> (transaction numbers, payments, pick-up date, settings) and the old **Staff** role no longer exists.

## Branding images (already included)
All in `frontend/public/` — replace the file (same name) to change it everywhere:
- `logo.png` — the ACC seal (square PNG, 512px). Used by the single `<Logo>` component: login/register, sidebar, About page.
- `favicon.png` — browser-tab icon.
- `login-image.jpg` — campus photo on the login/register pages (side panel on desktop, banner above the form on phones/tablets).
  The supplied photo is small (330×220), so it is shown as a framed photo rather than stretched full-screen. For a sharper result,
  replace it with a larger landscape image (about 1200×800 or more).

## Profile pictures
- Students **and** admins: **My Profile → Profile picture** → Upload / Change / Remove (JPG, PNG or WebP, max 2 MB).
  Files are saved on the `public` disk under `storage/app/public/avatars/` and served from `/storage/avatars/...`; the old file is deleted when replaced.
- The picture shows in the sidebar, and next to the person's name in the status timeline.
- Admins see each student's picture on the dashboard, in **All Requests**, on the request page (Student card) and in the new
  **Students** page (search, click a picture to enlarge it). A student without a photo shows a coloured initial.
- API: `POST /api/profile/photo` (field `photo`), `DELETE /api/profile/photo`, admin: `GET /api/admin/students`.

## How payments work (GCash, Bank Transfer and Cash)
Payment status: `Unpaid` -> `Pending Verification` -> `Verified` (or `Rejected`). Every step is validated on the server.

**GCash and Bank Transfer** are confirmed manually by the admin (no payment gateway is connected):
1. The admin fills in the GCash number / bank account under **Site Settings** (students see these with copy buttons).
2. The student pays and sends a **reference number** and/or **receipt** (JPG/PNG/PDF, max 5 MB) when submitting the request or later
   from the request page -> `Pending Verification`.
   - GCash reference: 10-20 digits. Bank reference: 6-40 letters/digits. Spaces/dashes are ignored.
   - The same reference number cannot be used on two requests (stops a receipt being reused).
3. The admin opens the request, checks the reference/receipt and clicks **Verify payment** (`Verified`, with who/when saved) or
   **Reject payment** (`Rejected`; a reason is required, the student is notified and must send details again).
   Only a payment the student actually submitted can be verified.

**Cash** is paid at the college office. The student picks *Cash* (nothing to upload); the admin clicks **Record cash payment**
(`Verified`, with who/when saved) once the money is received. **Undo cash record** reverts a mistake. Cash is not "verified" by a
second step — the admin recording it is the confirmation. A student who chose Cash can still switch to GCash / bank from the request page.

A paid document cannot be set to **Ready to pick up** or **Completed** until its payment is `Verified`.
Saved per request: method, reference no., receipt file, amount, payment status, rejection reason, when details were sent, when/who verified.

## Image preview toggle
Every image upload (supporting file, receipt, authorization letter) has a **Show preview / Hide preview** button that expands/collapses
the picture. It is hidden by default. The same toggle appears next to already-uploaded images on the request page. PDFs show no toggle.

## Ready to pick up
When the admin sets a request to **Ready to pick up**, the student simply sees the text "Ready to pick up." — no date or time is
shown or asked for anywhere. (The old `pickup_date` column is left in the database but is no longer used.)

## Yearly year-level question (students)
From school year **2026-2027** and every school year after (2027-2028, 2028-2029 ...), a student is asked once per school year:
"Are you now a 3rd year level?" for a 2nd-year student, "Are you now a 4th year level?" for a 3rd-year student, and so on (always the next level after their current one). **Yes** moves them up one level; **No** keeps their level.
The dialog has to be answered. Students already on the last level (5th Year) are not asked.
- A school year starts in **June** by default. Change with `SCHOOL_YEAR_START_MONTH` in `.env` (see `config/acc.php`).
- Registering, or editing the year level by hand in *My Profile*, counts as the answer for that school year.
- Stored in `students.year_level_checked_sy`. To test: set that column to `NULL` for a student and log in.
- API: `POST /api/student/year-level` with `{ "answer": "yes" | "no" }`; `GET /api/me` returns `user.year_level_prompt` when a question is due.

> **Upgrading?** Copy `backend-overlay/*` over your `backend/` folder, run `php artisan migrate` (renames "For Verification" to
> "Pending Verification", "Ready for Pick-up" to "Ready to pick up", adds `payment_remarks` and `students.year_level_checked_sy`),
> then `php artisan config:clear`. Existing students get the year-level question once.

## What's new in this version
- **Layout**: full-width sidebar layout that uses the whole screen; split-screen login/register with *About Abuyog Community College*.
- **About ACC** page + **Site Settings** (admin): edit about text, address, office hours, contact, GCash / bank accounts.
- **How to Claim**: admin writes the step-by-step process and uploads images/PDF guides; students see them.
- **Payment method**: students choose GCash or Bank Transfer, see the admin's account details, enter a reference no. / upload a receipt
  (now or later). Admin verifies the payment.
- **Transaction number** (e.g. `TXN-20261007-K7Q2ZP`) for every request, shown to the student and searchable by the admin.
- **Ready to pick up** option in the admin status dropdown; the student is notified and sees the text "Ready to pick up." (no date).
- **Admin notifications**: every new request / payment submission / cancellation notifies all admins (bell + pop-up, refreshed every 15 s).
- **Authorization letter**: if someone else will claim the document, the student enters the representative's name and is told the
  representative must bring an authorization letter (optional upload of a copy).
- **Cancel request** rebuilt with an in-page dialog (see note below).
- **Staff role removed** (Admin + Student only).

## Testing guide (main flow)
1. Log in as **juan** -> "New Request" -> pick a document, choose **GCash** or **Bank Transfer**, choose who picks it up -> Submit.
   You land on the request page with your **transaction number**.
2. Log in as **admin** (another browser/window) -> a pop-up and the bell show the new request; the dashboard says "new request waiting".
3. Open it -> **Verify payment** -> set status **Under Review** -> **Approved** -> **Processing**.
4. Choose **Ready to pick up** in the dropdown -> Update.
5. As Juan the request now shows "Ready to pick up." (no date; plus the authorization-letter reminder if a representative was chosen).
6. Admin -> **Site Settings**: edit the claim steps, upload a guide image/PDF, set GCash/bank details. Students see them under **How to Claim**.
7. As Juan submit another request and **Cancel** it while Pending (dialog asks for an optional reason; admins are notified).
8. **Profile pictures**: as Juan open *My Profile*, upload a JPG/PNG (try a 3 MB file or a .gif — you should get a clear error). The sidebar updates.
   Log in as admin → *Students*, *All Requests* and the request page now show Juan's picture. Upload one for the admin too. Try *Remove*.
9. **GCash**: new request → GCash → reference `1234567890123` (try `ABC` → rejected) → submit → payment shows *Pending Verification*.
   Admin: *Verify payment* → *Verified* (shows who/when). Submit the same reference on another request → rejected as already used.
10. **Bank Transfer**: same with reference like `TRF12345678` (symbols such as `AB#12` are rejected), or upload a receipt only.
11. As admin try *Ready to pick up* on a request whose payment is not verified → blocked with a message. Use *Reject payment* (with a reason) → student must re-send.
13. **Cash**: new request → Cash (no reference/receipt fields) → admin opens it → *Record cash payment* → payment shows *Verified*.
14. **Image preview**: pick a JPG/PNG as receipt → *Show receipt preview* expands it, *Hide receipt preview* collapses it.
15. **Year level**: log in as Juan (3rd Year) → dialog "Are you now a 4th year level?" → *Yes* changes it to 4th Year; as Ana (4th) choose *No* → unchanged. It does not come back until the next school year.
12. **Logo / login image**: log out and check the login page on a wide window and a phone-width window (photo above the form).

## Production / deployment notes
- Build the frontend: `cd frontend && npm run build` → serve `frontend/dist` from the same domain as the API
  (e.g. Nginx: `/` → dist with SPA fallback to index.html, `/api` and `/storage` → Laravel `public/`).
  If the API is on a different domain, set `CORS` allowed origins in `config/cors.php` (publish with `php artisan config:publish cors`)
  and change the axios `baseURL` in `frontend/src/api.js`.
- `.env`: `APP_ENV=production`, `APP_DEBUG=false`, strong `APP_KEY` (`php artisan key:generate`), HTTPS `APP_URL`.
- Run: `composer install --no-dev --optimize-autoloader`, `php artisan migrate --force`, `php artisan config:cache route:cache`,
  `php artisan storage:link`. Point the web root to `backend/public`, make `storage/` and `bootstrap/cache/` writable.
- **Change all seeded passwords** (or remove the sample users from `DatabaseSeeder`) before going live.
- Email notifications: in-app notifications are built in. To add email, set `MAIL_*` in `.env` and send a Mailable
  from `DocumentRequest::changeStatus()`.
- Payments are verified/recorded manually by the admin (no payment gateway is connected) — see "How payments work".
- Backup `storage/app/public/` too: it holds profile pictures, receipts and claim-process files.

## Troubleshooting
- `SQLSTATE ... Unknown database` → Step 1 not done or wrong `DB_DATABASE`.
- 401 after login / blank page → make sure `php artisan serve` is running on port 8000.
- Uploaded file link 404 → run `php artisan storage:link`.
- "Class not found" after copying files → run `composer dump-autoload`.


## Reports (admin) — requests per document type for a day, week or month
**Reports** in the admin menu (`/reports`).
- Tabs **Day / Week / Month** + a date picker (arrows move one day / week / month). Week = Monday–Sunday.
- Table: for every document type -> requests, copies, completed, in progress, rejected/cancelled, payments collected (verified), with a total row.
  Requests are counted by the day they were **submitted**; trashed requests are not counted.
- Three cards on top show the day / week / month totals for the chosen date. Week and month also show a requests-per-day bar chart.
- **Print** (menu and buttons are hidden on paper) and **Export CSV** (opens in Excel).
- API: `GET /api/admin/reports?period=day|week|month&date=YYYY-MM-DD` and `GET /api/admin/reports/export` (same parameters). Admin only.
- **Set your timezone** so "today" matches the Philippines: in `backend/.env` use `APP_TIMEZONE=Asia/Manila`, then `php artisan config:clear`.
- The seeder now spreads the sample requests over the last ~25 days so the week and month reports show data after `php artisan migrate:fresh --seed`.

## Security: SQL injection and cross-site scripting (XSS)
This version **protects** the system against both attacks (nothing vulnerable was added on purpose).

**SQL injection**
- Every query uses Eloquent / bound parameters, so typed text is sent to MySQL as data and can never change the SQL (`' OR 1=1 --` is just a harmless search word).
- Admin filters (`status`, `payment_status`, `document_type_id`, dates, `search`) are validated first: allowed values only, correct type, max length.
- The admin search escapes `%` and `_` (`App\Support\Search::like`), so they cannot be used as wildcards.
- The report uses one grouped query whose values are all bound parameters.

**Cross-site scripting (XSS)** — three layers
1. **Input**: `SanitizeInput` middleware (every API route) strips HTML tags, NULL bytes and control characters from all text (passwords are left untouched).
2. **Output**: React escapes everything it shows; the app never uses `dangerouslySetInnerHTML`. Links/images only accept `/storage/...` or http(s) URLs (`safeUrl()`), so `javascript:` links are impossible. Uploaded file names are cleaned.
3. **Browser policy**: `SecurityHeaders` adds `Content-Security-Policy`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Cache-Control: no-store` to every API response, and `npm run build` adds a Content-Security-Policy to the site itself (only our own scripts may run).

**Other hardening**: year level must be one of the real levels (no free text); passwords need letters + numbers (min 8); 120 requests/minute limit for logged-in users on top of the login (5/min) and register (10/min) limits; CSV export neutralises Excel formulas (`=`, `+`, `-`, `@`).

**For production, also send the site's CSP as a real HTTP header** (stronger than the `<meta>` tag) — Nginx example:
```
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" always;
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
location /storage/ { add_header X-Content-Type-Options nosniff always; add_header Content-Security-Policy "default-src 'none'; sandbox" always; }
```
Known limit: the login token is kept in `localStorage` (normal for a token-based SPA). The CSP above is what stops injected scripts from reading it.

**Quick security tests**: search `' OR 1=1 --` or `%` in All Requests (no extra rows, no error); register with the name `<script>alert(1)</script>` or `<img src=x onerror=alert(1)>` (saved without the tags, nothing pops up); a purpose of `<b>hi</b>` is stored as `hi`.

## Tests
`php artisan test --filter=YearLevelPromptTest` checks the yearly question (2026-2027 -> "Are you now a 3rd year level?" for a 2nd year, 2027-2028 -> 4th, never twice in one school year, never for 5th year).

## UI clean-up in this version
Table cells have even spacing on every page, flat white cards with a thin border (no heavy shadows), a solid sidebar with a quieter active item, a plain header, softer page background, visible keyboard focus, print styles, and the Year Level in *My Profile* is now a dropdown.

> **Upgrading?** Copy `backend-overlay/*` over `backend/` (this adds the middleware, `Support/Search.php`, `ReportController`, the test), copy the `frontend/` files, run `php artisan config:clear`, `npm install`, `npm run dev`. No new migration is needed.
