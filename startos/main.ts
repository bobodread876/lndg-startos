import { baseSettingsPy } from './fileModels/base-settings.py'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  adminUsername,
  appDir,
  composeOverrides,
  dataDir,
  lndMount,
  settingsPath,
  uiPort,
} from './utils'

// Idempotent Django superuser sync. No-ops when no password is set — the
// critical task in `init/taskSetAdminCredentials.ts` handles prompting.
// Password is passed via env to keep it out of the shell command.
const ensureSuperuserPy = `
import os, sys
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', '')
if not password:
    sys.exit(0)
from django.contrib.auth import get_user_model
U = get_user_model()
username = os.environ['DJANGO_SUPERUSER_USERNAME']
u, _ = U.objects.get_or_create(username=username)
u.is_staff = True
u.is_superuser = True
u.is_active = True
u.set_password(password)
u.save()
`.trim()

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting LNDg...'))

  const hostnames =
    (await sdk.serviceInterface
      .getOwn(effects, 'ui', (i) =>
        i?.addressInfo?.format('hostname-info').map((h) => h.hostname),
      )
      .const()) || []

  const allowedHosts = Array.from(
    new Set(['localhost', '127.0.0.1', 'lndg.startos', ...hostnames]),
  )
  const csrfOrigins = Array.from(
    new Set([
      'https://lndg.startos',
      ...hostnames.map((h) => `https://${h}`),
      ...hostnames.map((h) => `http://${h}`),
    ]),
  )

  const adminPassword = await storeJson
    .read((s) => s.adminPassword)
    .const(effects)

  const baseSettings = await baseSettingsPy.read().const(effects)
  if (!baseSettings) {
    throw new Error('No base-settings.py')
  }

  const appSub = await sdk.SubContainer.of(
    effects,
    { imageId: 'lndg' },
    sdk.Mounts.of()
      .mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: dataDir,
        readonly: false,
      })
      .mountDependency({
        dependencyId: 'lnd',
        volumeId: 'main',
        subpath: null,
        mountpoint: lndMount,
        readonly: true,
      }),
    'lndg-main',
  )

  // base (upstream-canonical) + overrides (StartOS). Python's
  // last-assignment-wins shadows upstream without mutating the base file.
  await appSub.writeFile(
    settingsPath,
    baseSettings +
      '\n' +
      composeOverrides({ allowedHosts, csrfOrigins }) +
      '\n',
  )

  return sdk.Daemons.of(effects)
    .addOneshot('migrate', {
      subcontainer: appSub,
      exec: {
        command: ['python', 'manage.py', 'migrate', '--noinput'],
        cwd: appDir,
        user: 'root',
      },
      requires: [],
    })
    .addOneshot('ensure-superuser', {
      subcontainer: appSub,
      exec: {
        command: ['python', 'manage.py', 'shell', '-c', ensureSuperuserPy],
        cwd: appDir,
        env: {
          DJANGO_SUPERUSER_USERNAME: adminUsername,
          ...(adminPassword && { DJANGO_SUPERUSER_PASSWORD: adminPassword }),
        },
        user: 'root',
      },
      requires: ['migrate'],
    })
    .addOneshot('collectstatic', {
      subcontainer: appSub,
      exec: {
        command: ['python', 'manage.py', 'collectstatic', '--noinput'],
        cwd: appDir,
        user: 'root',
      },
      requires: ['ensure-superuser'],
    })
    .addDaemon('primary', {
      subcontainer: appSub,
      exec: {
        command: ['python', 'controller.py', 'runserver', `0.0.0.0:${uiPort}`],
        cwd: appDir,
        user: 'root',
      },
      ready: {
        display: i18n('Web Interface'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, uiPort, {
            successMessage: i18n('The web interface is ready'),
            errorMessage: i18n('The web interface is not ready'),
          }),
        gracePeriod: 60_000,
      },
      requires: ['collectstatic'],
    })
})
