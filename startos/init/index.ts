import { actions } from '../actions'
import { restoreInit } from '../backups'
import { setDependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { sdk } from '../sdk'
import { versionGraph } from '../versions'
import { bootstrapSettings } from './bootstrapSettings'
import { seedFiles } from './seedFiles'
import { taskSetAdminCredentials } from './taskSetAdminCredentials'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedFiles,
  bootstrapSettings,
  setInterfaces,
  setDependencies,
  actions,
  taskSetAdminCredentials,
)

export const uninit = sdk.setupUninit(versionGraph)
