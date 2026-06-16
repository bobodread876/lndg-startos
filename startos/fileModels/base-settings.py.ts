import { FileHelper } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { baseSettingsFilename } from '../utils'

/**
 * Canonical upstream Django settings.py, generated once per install/upgrade by
 * `init/bootstrapSettings.ts` calling upstream's `initialize.write_settings`
 * inside a temp subcontainer and persisted on the main volume.
 *
 * Never edited after generation — StartOS overrides are appended at daemon
 * start by `main.ts` (Python's last-assignment-wins semantics means our
 * appended block overrides any upstream default without mutating this file).
 */
export const baseSettingsPy = FileHelper.string({
  base: sdk.volumes.main,
  subpath: `./${baseSettingsFilename}`,
})
