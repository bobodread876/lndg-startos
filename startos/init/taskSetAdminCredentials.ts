import { resetAdminCredentials } from '../actions/resetAdminCredentials'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const taskSetAdminCredentials = sdk.setupOnInit(async (effects) => {
  const adminPassword = await storeJson
    .read((s) => s.adminPassword)
    .const(effects)

  if (!adminPassword) {
    await sdk.action.createOwnTask(effects, resetAdminCredentials, 'critical', {
      reason: i18n('Create your LNDg admin credentials'),
    })
  }
})
