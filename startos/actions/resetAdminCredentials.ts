import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { adminUsername } from '../utils'

export const resetAdminCredentials = sdk.Action.withoutInput(
  // id
  'reset-admin-credentials',

  // metadata
  async ({ effects }) => {
    const hasPass =
      ((await storeJson.read((s) => s.adminPassword).const(effects)) ?? '') !==
      ''

    return {
      name: hasPass
        ? i18n('Reset Admin Credentials')
        : i18n('Create Admin Credentials'),
      description: hasPass
        ? i18n('Reset your LNDg admin password')
        : i18n('Create your LNDg admin password'),
      warning: null,
      allowedStatuses: 'any',
      group: null,
      visibility: 'enabled',
    }
  },

  // execution
  async ({ effects }) => {
    const adminPassword = utils.getDefaultString({
      charset: 'a-z,A-Z,0-9',
      len: 22,
    })

    await storeJson.merge(effects, { adminPassword })

    return {
      version: '1',
      title: i18n('Success'),
      message: i18n(
        'Your LNDg admin credentials are below. Write them down or save them to a password manager — anyone with these credentials can control your LND node through LNDg.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Username'),
            description: null,
            value: adminUsername,
            masked: false,
            copyable: true,
            qr: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: adminPassword,
            masked: true,
            copyable: true,
            qr: false,
          },
        ],
      },
    }
  },
)
