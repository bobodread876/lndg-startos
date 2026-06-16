import { VersionInfo, IMPOSSIBLE } from '@start9labs/start-sdk'
import { rm } from 'fs/promises'

export const v_1_10_1_4 = VersionInfo.of({
  version: '1.10.1:4',
  releaseNotes: {
    en_US: 'Internal updates (start-sdk 1.5.2).',
    es_ES: 'Actualizaciones internas (start-sdk 1.5.2).',
    de_DE: 'Interne Aktualisierungen (start-sdk 1.5.2).',
    pl_PL: 'Aktualizacje wewnętrzne (start-sdk 1.5.2).',
    fr_FR: 'Mises à jour internes (start-sdk 1.5.2).',
  },
  migrations: {
    up: async ({ effects }) => {
      // Clean up any legacy start9 directory left over from the pre-0.4 package
      await rm('/media/startos/volumes/main/start9', {
        recursive: true,
      }).catch(() => {})
    },
    down: IMPOSSIBLE,
  },
})
