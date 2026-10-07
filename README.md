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

> Upgrading from the old version? Run `php artisan migrate:fresh --seed` again. The database layout changed
> (transaction numbers, payments, pick-up date, settings) and the old **Staff** role no longer exists.

## Your logo
Put the college logo at `frontend/public/logo.png` (square PNG). It appears on the login page, sidebar and About page.
Until then a round "ACC" badge is shown.

## What's new in this version
- **Layout**: full-width sidebar layout that uses the whole screen; split-screen login/register with *About Abuyog Community College*.
- **About ACC** page + **Site Settings** (admin): edit about text, address, office hours, contact, GCash / bank accounts.
- **How to Claim**: admin writes the step-by-step process and uploads images/PDF guides; students see them.
- **Payment method**: students choose GCash or Bank Transfer, see the admin's account details, enter a reference no. / upload a receipt
  (now or later). Admin verifies the payment.
- **Transaction number** (e.g. `TXN-20261007-K7Q2ZP`) for every request, shown to the student and searchable by the admin.
- **Ready for Pick-up** option in the admin status dropdown with a required **pick-up date**; the student is notified.
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
4. Choose **Ready for Pick-up** in the dropdown -> a **pick-up date** field appears (required) -> Update.
5. As Juan the request now shows "Ready for pick-up on <date>" (and the authorization-letter reminder if a representative was chosen).
6. Admin -> **Site Settings**: edit the claim steps, upload a guide image/PDF, set GCash/bank details. Students see them under **How to Claim**.
7. As Juan submit another request and **Cancel** it while Pending (dialog asks for an optional reason; admins are notified).

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
- Payments are verified manually by the admin (no payment gateway is connected).

## Troubleshooting
- `SQLSTATE ... Unknown database` → Step 1 not done or wrong `DB_DATABASE`.
- 401 after login / blank page → make sure `php artisan serve` is running on port 8000.
- Uploaded file link 404 → run `php artisan storage:link`.
- "Class not found" after copying files → run `composer dump-autoload`.
