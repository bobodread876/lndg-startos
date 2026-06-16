import { setupManifest } from '@start9labs/start-sdk'
import { depLndDescription, long, short } from './i18n'

export const manifest = setupManifest({
  id: 'lndg',
  title: 'LNDg',
  license: 'MIT',
  packageRepo: 'https://github.com/Start9-Community/lndg-startos',
  upstreamRepo: 'https://github.com/cryptosharks131/lndg',
  marketingUrl: 'https://x.com/cryptosharks131',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    lndg: {
      source: { dockerTag: 'ghcr.io/cryptosharks131/lndg:v1.10.1' },
      arch: ['x86_64', 'aarch64'],
    },
  },
  alerts: {
    install: null,
    update: null,
    uninstall: null,
    restore: null,
    start: null,
    stop: null,
  },
  dependencies: {
    lnd: {
      description: depLndDescription,
      optional: false,
      metadata: {
        title: 'LND',
        icon: 'https://raw.githubusercontent.com/Start9Labs/lnd-startos/refs/heads/master/icon.svg',
      },
    },
  },
})
