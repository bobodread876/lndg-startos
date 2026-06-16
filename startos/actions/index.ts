import { sdk } from '../sdk'
import { resetAdminCredentials } from './resetAdminCredentials'

export const actions = sdk.Actions.of().addAction(resetAdminCredentials)
