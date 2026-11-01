import { reactive } from 'vue'

import { getSheet, putSheet, type Sheet } from '@/core/api/characters'
import { type Autosave, createAutosave } from './autosave'

export interface OpenSheet {
  sheet: Sheet
  // Cópia editável de sheet.data; as telas do sistema mudam aqui e chamam changed.
  data: Record<string, unknown>
  autosave: Autosave
  changed: () => void
}

// A mesma ficha aberta em várias telas (um passo por página do Ionic) é um
// objeto só, para nenhuma tela editar uma cópia velha.
const open = new Map<string, OpenSheet>()

function track(sheet: Sheet): OpenSheet {
  const autosave = createAutosave({
    revision: sheet.revision,
    put: async (data, revision) => {
      const saved = await putSheet(sheet.id, data, revision)
      entry.sheet = saved
      return saved.revision
    },
  })
  const entry: OpenSheet = reactive({
    sheet,
    data: structuredClone(sheet.data),
    autosave,
    changed: () => autosave.schedule(JSON.parse(JSON.stringify(entry.data))),
  }) as OpenSheet
  open.set(sheet.id, entry)
  return entry
}

export function adopt(sheet: Sheet): OpenSheet {
  return open.get(sheet.id) ?? track(sheet)
}

export async function openSheet(id: string): Promise<OpenSheet> {
  return open.get(id) ?? track(await getSheet(id))
}

// Depois de um conflito: descarta a cópia local e lê a versão do servidor.
export async function reloadSheet(id: string): Promise<OpenSheet> {
  open.delete(id)
  return openSheet(id)
}
