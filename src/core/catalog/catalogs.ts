import { createCatalogLoader } from './loader'

export const catalogs = createCatalogLoader({
  baseUrl: import.meta.env.VITE_SYSTEMS_URL ?? 'http://localhost:8081',
})
