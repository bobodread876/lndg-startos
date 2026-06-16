<p align="center">
  <img src="icon.png" alt="LNDg Logo" width="21%">
</p>

# LNDg on StartOS

> **Upstream docs:** <https://github.com/cryptosharks131/lndg#readme>
>
> Everything not listed in this document should behave the same as upstream
> LNDg. If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable.

[LNDg](https://github.com/cryptosharks131/lndg) is a web interface and
auto-rebalancer for LND routing node operators. It analyzes LND data and
leverages its backend database for automation tools around rebalancing and
basic maintenance tasks.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Dependencies](#dependencies)
- [Actions](#actions)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

| Property | Value |
|----------|-------|
| Image | `ghcr.io/cryptosharks131/lndg` (unmodified) |
| Architectures | x86_64, aarch64 |
| Upstream WORKDIR | `/app` (cloned lndg repo) |
| Runtime | Python / Django + Django REST Framework |

---

## Volume and Data Layout

| Volume | Mount Point | Purpose |
|--------|-------------|---------|
| `main` | `/data` | Service data root (sqlite DB + `store.json`) |
| LND dependency | `/mnt/lnd` | Read-only access to LND macaroon and TLS cert |

**Key paths on the `main` volume:**

- `store.json` — admin username and password (StartOS-managed)
- `db.sqlite3` — LNDg Django sqlite database
- `base-settings.py` — upstream-canonical Django settings (seeded per install/upgrade; used as the base layer when composing the subcontainer's `settings.py` at start)

---

## Installation and First-Run Flow

| Step | Upstream | StartOS |
|------|----------|---------|
| Installation | `git clone` + `pip install` | Install from marketplace |
| Settings generation | Manual `python initialize.py` | `init/bootstrapSettings.ts` runs `initialize.write_settings` once per install/upgrade in a temp subcontainer |
| Database init | `manage.py migrate` | `migrate` oneshot on every start (idempotent) |
| LND connection | Manual flags to `initialize.py` | Auto-wired via LND dependency |
| Authentication | Interactive prompt or `-pw` flag | Generated on-demand by the **Admin Credentials** critical task |

**First-run steps:**

1. Install LND on StartOS.
2. Install LNDg from the marketplace. Init creates an empty `store.json`
   (no password yet) and `bootstrapSettings` writes the upstream-canonical
   `base-settings.py` onto the main volume.
3. Because no admin password exists yet, a **critical task** appears
   prompting you to run the **Admin Credentials** action. Run it — it
   generates a 22-character password, persists it to `store.json`, and
   reveals both the username and password. Save the password somewhere
   safe.
4. Start the service. Main composes `settings.py` from the base plus
   StartOS overrides, runs Django migrations, and `ensure-superuser`
   creates the `lndg-admin` Django user with the password you just
   generated.
5. Open the web UI and log in as `lndg-admin` with the retrieved password.
6. If you ever forget the password, run the **Admin Credentials** action
   again while the service is stopped — it resets the password and
   reveals the new value. The Django superuser gets re-synced on the next
   start.

---

## Configuration Management

### store.json (StartOS-managed)

| Field | Default | Purpose |
|-------|---------|---------|
| `adminUsername` | `lndg-admin` | Django superuser name |
| `adminPassword` | Unset initially — generated on-demand by the **Admin Credentials** action | Django superuser password. Whenever this field is missing, a critical task appears prompting the user to create (first run) or reset (subsequent runs) the credentials. |

### settings.py (base + overrides)

`lndg/settings.py` is built from two independent layers:

1. **Base** (`main:./base-settings.py`, persisted on volume) — upstream's
   canonical Django settings.py, written once per install/upgrade by
   `init/bootstrapSettings.ts`. That init step spins up a temp subcontainer
   (`sdk.SubContainer.withTemp`), calls `initialize.write_settings` via
   `python -c` (skipping upstream's embedded `initialize_django` phase so
   no ephemeral migrate/collectstatic/createsuperuser runs), and `cp`s the
   generated file onto the main volume. Upstream owns this content —
   `LOGIN_REQUIRED`, `AUTH_PASSWORD_VALIDATORS`, `INSTALLED_APPS`,
   `MIDDLEWARE`, `REST_FRAMEWORK`, `SESSION_COOKIE_AGE`, etc. all flow
   through untouched.

2. **Overrides** (composed in TypeScript via `composeOverrides()` in
   `utils.ts`) — appended to the base on every service start. Python's
   last-assignment-wins semantics means these silently shadow upstream's
   defaults without mutating the base file.

At daemon start, `main.ts` reads the base (reactive via
`FileHelper.string.const()`) and writes the concatenation to the
subcontainer's `/app/lndg/settings.py` via `appSub.writeFile`. The
subcontainer rootfs is ephemeral — settings.py is composed fresh each
start so interface add/remove propagates via the reactive hostname read.

| Setting | Layer | Source |
|---------|-------|--------|
| `INSTALLED_APPS`, `MIDDLEWARE`, `TEMPLATES`, `AUTH_PASSWORD_VALIDATORS`, `REST_FRAMEWORK`, `LOGIN_REQUIRED`, `SESSION_COOKIE_AGE`, `SECRET_KEY`, `LND_*` | Base | Upstream `initialize.write_settings` output. `SECRET_KEY` is a random 64-char value upstream writes into `base-settings.py`; it persists on the volume across service restarts and rotates only on install/restore/upgrade. |
| `DATABASES` | Override | sqlite at `/data/db.sqlite3` on the persistent volume |
| `ALLOWED_HOSTS` | Override | `localhost`, `127.0.0.1`, `lndg.startos`, plus every hostname from the `ui` interface |
| `CSRF_TRUSTED_ORIGINS` | Override | `https://lndg.startos` plus every UI hostname with both `http://` and `https://` schemes (belt-and-suspenders — see note below) |
| `SECURE_PROXY_SSL_HEADER`, `USE_X_FORWARDED_HOST` | Override | Tells Django to honor the `X-Forwarded-Proto` / `X-Forwarded-Host` headers set by StartOS's reverse proxy on the internal `10.0.3.0/24` network. Without this, Django sees the request as HTTP (the proxy terminated TLS) while the browser sent `Origin: https://...`, producing a CSRF Origin mismatch that 403s every POST. Analogue of nextcloud's `trusted_proxies` config. |
| `CORS_ALLOW_CREDENTIALS`, `CORS_ORIGIN_ALLOW_ALL`, `GRPC_DNS_RESOLVER` | Override | Static — required for StartOS hostname/DNS behavior |
| `LOGIN_URL`, `LOGIN_REDIRECT_URL` | Override | `/lndg-admin/login/` and `/` |

---

## Network Access and Interfaces

| Interface | Port | Protocol | Purpose |
|-----------|------|----------|---------|
| Web UI (`ui`) | 8889 | HTTP | Node management dashboard |

---

## Dependencies

| Dependency | Required | Purpose |
|------------|----------|---------|
| LND | Required | Lightning node to manage and automate |

LNDg reads LND's TLS cert directly from the read-only dependency mount
(`/mnt/lnd/tls.cert`) and reads the admin macaroon from its own local copy
on the `main` volume (`/data/macaroons/.../admin.macaroon`), refreshed on
every startup.

---

## Actions

| Action | Purpose |
|--------|---------|
| Admin Credentials (`reset-admin-credentials`) | Create (first run) or reset (subsequent runs) the LNDg admin password. Reveals the username and new password. Only runnable while the service is stopped. |

---

## Backups and Restore

**Included in backup:**

- `main` volume — includes `store.json`, `db.sqlite3`, and `base-settings.py`

**Restore behavior:**

- Credentials are restored as-is (`store.json`).
- Sqlite DB is restored to `/data/db.sqlite3` on the volume.
- `base-settings.py` is re-generated on restore anyway (since
  `bootstrapSettings` runs on every init kind), so a backup taken against
  an older image version stays consistent with the current image.
- LND macaroon and TLS cert are read live from the read-only LND dependency
  mount (`/mnt/lnd`) — nothing to restore.

---

## Health Checks

| Check | Display Name | Method | Messages |
|-------|--------------|--------|----------|
| Web UI | Web Interface | Port 8889 listening | Ready / Not ready |

The health check has a 60-second grace period to allow Django migrations
and static file collection to complete after a fresh container rebuild.

---

## Limitations and Differences

1. **settings.py is a composed file.** The upstream-canonical base lives
   on the volume at `base-settings.py` (written once per install/upgrade);
   the subcontainer's `/app/lndg/settings.py` is re-composed on every start
   from base + StartOS overrides. Manual edits to either layer will not
   persist through a restart.
2. **LND mount is read-only.** LNDg reads the LND admin macaroon and TLS
   cert directly from the dependency mount at `/mnt/lnd`; no copy is kept
   on the LNDg volume.
3. **Admin password is generated by the action, not pre-seeded.** On fresh
   install the `adminPassword` field in `store.json` is absent, which
   triggers a critical task pointing at the **Admin Credentials** action.
   The action generates the password, persists it, and reveals it in the
   same response. Use the same action to reset the password later.
4. **Single-network: mainnet only.** `initialize.py` is invoked with
   `-net mainnet`, matching the behavior of the legacy package.
5. **Legacy `config.yaml` / `stats.yaml` files are gone.** The legacy
   package used them for StartOS config/properties; they are now
   replaced by `store.json` and the **Admin Credentials** action.

---

## What Is Unchanged from Upstream

- Auto-rebalancer logic and configuration (inside the LNDg web UI)
- Channel analysis, forwards dashboard, and failed HTLC explorer
- Fee management tools
- All `controller.py` background jobs
- REST API surface

---

## Quick Reference for AI Consumers

```yaml
package_id: lndg
image: ghcr.io/cryptosharks131/lndg
architectures: [x86_64, aarch64]
volumes:
  main: /data
dependency_mounts:
  lnd:main -> /mnt/lnd (read-only)
ports:
  ui: 8889
dependencies:
  lnd (required)
actions:
  - reset-admin-credentials
health_checks:
  - ui: port_listening 8889 (60s grace)
backup_volumes:
  - main
settings_py_composition:
  - base: main:./base-settings.py (upstream canonical, written by init/bootstrapSettings.ts via SubContainer.withTemp + initialize.write_settings)
  - overrides: composeOverrides() in utils.ts (appended in main.ts at every start)
task_reactive:
  - critical: reset-admin-credentials (whenever adminPassword is missing)
```
