export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting LNDg...': 0,
  'Web Interface': 1,
  'The web interface is ready': 2,
  'The web interface is not ready': 3,

  // interfaces.ts
  'Web UI': 4,
  'The web interface of LNDg': 5,

  // init + actions
  'Create your LNDg admin credentials': 6,
  'Create Admin Credentials': 7,
  'Reset Admin Credentials': 8,
  'Create your LNDg admin password': 9,
  'Reset your LNDg admin password': 10,
  'Your LNDg admin credentials are below. Write them down or save them to a password manager — anyone with these credentials can control your LND node through LNDg.':
    11,
  Success: 12,
  Username: 13,
  Password: 14,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
