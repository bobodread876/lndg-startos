import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

export const seedFiles = sdk.setupOnInit(async (effects) => {
  // Ensure store.json exists with schema defaults so `read().once()` returns
  // a populated shape on every kind (install/restore). The admin password is
  // intentionally NOT seeded here — its absence is what triggers the critical
  // task in taskSetAdminCredentials, prompting the user to create the
  // credentials on first run (mirrors lightning-terminal-startos).
  await storeJson.merge(effects, {})
})
