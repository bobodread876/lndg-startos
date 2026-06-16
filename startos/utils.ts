export const uiPort = 8889

// Path inside the subcontainer where the upstream lndg repo lives (WORKDIR of the image)
export const appDir = '/app' as const

// Path inside the subcontainer where LND's volume is mounted (read-only).
// Upstream `initialize.py --lnddir <path>` derives tls.cert, admin.macaroon,
// and channel.db paths from this.
export const lndMount = '/mnt/lnd' as const

// Path inside the subcontainer where the service's own `main` volume is mounted.
// Persists the sqlite DB and `base-settings.py` across container rebuilds.
export const dataDir = '/data' as const

// SQLite DB lives on the `main` volume. Overridden into settings.py by
// the appended overrides block at daemon start.
export const dbPath = `${dataDir}/db.sqlite3` as const

// Django settings file inside the subcontainer. Composed on every start as
// `<base-settings.py from volume> + \n + <overrides block>` and written to
// the subcontainer rootfs via `appSub.writeFile`. Ephemeral — regenerated
// each start so reactive interface changes flow through.
export const settingsPath = `${appDir}/lndg/settings.py` as const

// Persisted upstream-canonical settings.py filename on the main volume.
// Written once per install/upgrade by `init/bootstrapSettings.ts`.
export const baseSettingsFilename = 'base-settings.py' as const

// LND gRPC endpoint (resolved over StartOS internal DNS)
export const lndRpcHost = 'lnd.startos' as const
export const lndRpcPort = 10009

export const adminUsername = 'lndg-admin' as const

// StartOS overrides appended to upstream's settings.py. Python's
// last-assignment-wins lets us shadow upstream defaults without editing
// the base file.
export function composeOverrides(opts: {
  allowedHosts: string[]
  csrfOrigins: string[]
}): string {
  const quote = (s: string) => `'${s.replace(/'/g, "\\'")}'`
  const hostsList = opts.allowedHosts.map(quote).join(', ')
  const originsList = opts.csrfOrigins.map(quote).join(', ')

  return `# --- StartOS overrides (appended at daemon start) ---
ALLOWED_HOSTS = [${hostsList}]
CSRF_TRUSTED_ORIGINS = [${originsList}]
# StartOS terminates TLS upstream. Honor X-Forwarded-Proto so Django's
# calculated origin matches the browser's — otherwise login POSTs 403 on
# CSRF origin mismatch.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
CORS_ALLOW_CREDENTIALS = True
CORS_ORIGIN_ALLOW_ALL = True
GRPC_DNS_RESOLVER = 'native'
LOGIN_URL = '/lndg-admin/login/'
LOGIN_REDIRECT_URL = '/'
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ${quote(dbPath)},
        'OPTIONS': {'timeout': 20},
    },
}
`
}
