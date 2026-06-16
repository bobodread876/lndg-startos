import { sdk } from '../sdk'
import {
  appDir,
  baseSettingsFilename,
  dataDir,
  lndMount,
  lndRpcHost,
  lndRpcPort,
  settingsPath,
} from '../utils'

/**
 * Seeds `main:./base-settings.py` with upstream's canonical Django settings.py.
 *
 * Runs on every init kind (install, restore, upgrade) because the base file
 * is tied to the upstream image version: a restore from a v1.10.x backup
 * onto a v1.11.x image would leave a stale base, and a version bump needs
 * to pick up any new upstream fields.
 *
 * Calls `initialize.write_settings` directly via `python -c` to skip the
 * script's `initialize_django` phase (migrate / collectstatic / createsuperuser
 * against an ephemeral DB) — we want the file, nothing else.
 *
 * The temp subcontainer mounts the main volume at `/data` so we can `cp` the
 * generated file off its ephemeral rootfs onto persistent storage.
 */
export const bootstrapSettings = sdk.setupOnInit(async (effects) => {
  await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'lndg' },
    sdk.Mounts.of().mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: dataDir,
      readonly: false,
    }),
    'lndg-bootstrap-settings',
    async (sub) => {
      const writeSettings = `
from initialize import write_settings
write_settings(
    node_ip='*',
    lnd_tls_path='${lndMount}/tls.cert',
    lnd_macaroon_path='${lndMount}/data/chain/bitcoin/mainnet/admin.macaroon',
    lnd_database_path='${lndMount}/data/graph/mainnet/channel.db',
    lnd_network='mainnet',
    lnd_rpc_server='${lndRpcHost}:${lndRpcPort}',
    lnd_max_message='35',
    whitenoise=True,
    debug=False,
    csrftrusted=None,
    nologinrequired=False,
    force_new=True,
    cookie_age=604800,
)
`.trim()

      await sub.execFail(['python', '-c', writeSettings], {
        cwd: appDir,
        user: 'root',
      })

      await sub.execFail(
        ['cp', settingsPath, `${dataDir}/${baseSettingsFilename}`],
        { user: 'root' },
      )
    },
  )
})
