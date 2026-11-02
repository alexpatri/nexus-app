<script setup lang="ts">
import { IonContent, IonFooter } from '@ionic/vue'
import { computed, ref } from 'vue'

import type { RulesSystem } from '@/core/rules/system'
import type { OpenSheet } from '@/core/sheets/open'
import NxBar from '@/core/ui/NxBar.vue'
import type { Derived } from '../rules'
import type { Sheet } from '../rules/validate'
import { nameOf, useCatalogs } from '../creation/catalogs'
import { augCategories, decimal, gearName, yen } from '../creation/resources'

const props = defineProps<{ open: OpenSheet; rules: RulesSystem }>()

const c = useCatalogs()
const sheet = computed(() => props.open.data as Sheet)
const derived = computed(() => {
  try {
    return props.rules.derive(props.open.data) as Derived
  } catch {
    return undefined
  }
})
const warnings = computed(() => props.rules.validate(props.open.data, 'strict'))
const base = computed(() => `/fichas/${props.open.sheet.id}`)

const awakened = computed(() => {
  const a = sheet.value.magic?.awakening
  if (!a) return undefined
  return a === 'technomancer' ? 'Ressonância' : 'Magia'
})
const tabs = computed(() => [
  { id: 'summary', label: 'Resumo' },
  { id: 'skills', label: 'Perícias' },
  { id: 'gear', label: 'Equipamento' },
  { id: 'contacts', label: 'Contatos' },
  ...(awakened.value ? [{ id: 'magic', label: awakened.value }] : []),
])
const tab = ref('summary')

const identity = computed(() => sheet.value.identity ?? {})
const attr = (id: string) => derived.value?.attributes?.[id]
const grid = ['bod', 'agi', 'rea', 'str', 'wil', 'log', 'int', 'cha']
const abbr = (id: string) => c.attributes.find((a) => a.id === id)?.abbr ?? id
const boxes = (n = 0) => Array.from({ length: n })

const active = computed(() =>
  Object.entries(derived.value?.skills?.active ?? {})
    .map(([id, s]) => ({ id, name: nameOf(c.skills, id), ...s }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
)
const knowledge = computed(() =>
  (sheet.value.skills?.knowledge ?? []).map((k) => ({
    key: k.key,
    name: k.name,
    ...derived.value?.skills?.knowledge?.[k.key],
  })),
)
const languages = computed(() =>
  (sheet.value.skills?.languages ?? []).map((l) => ({
    key: l.key,
    name: l.name,
    ...derived.value?.skills?.languages?.[l.key],
  })),
)

const gear = computed(() => {
  const r = sheet.value.resources ?? {}
  return [
    {
      title: 'Estilo de vida',
      items: (r.lifestyles ?? []).map((x) => ({
        key: x.key,
        name: gearName(c, x.id),
        detail: x.primary ? 'Principal' : '',
      })),
    },
    {
      title: 'Identidades',
      items: (r.identities ?? []).map((x) => ({
        key: x.key,
        name: x.name || 'SIN sem nome',
        detail: `SIN falso ${x.rating ?? 1}; ${(x.licenses ?? []).map((l) => `${l.name || 'licença'} ${l.rating ?? 1}`).join(', ') || 'sem licenças'}`,
      })),
    },
    {
      title: 'Armas',
      items: (r.weapons ?? []).map((x) => ({
        key: x.key,
        name: gearName(c, x.id),
        detail: (x.quantity ?? 1) > 1 ? `${x.quantity} unidades` : '',
      })),
    },
    {
      title: 'Armadura',
      items: (r.armor ?? []).map((x) => ({
        key: x.key,
        name: gearName(c, x.id),
        detail: (x.modifications ?? []).map((m) => gearName(c, m.id)).join(', '),
      })),
    },
    {
      title: 'Ampliações',
      items: (r.augmentations ?? []).map((x) => {
        const a = c.augmentations.find((y) => y.id === x.id)
        return {
          key: x.key,
          name: gearName(c, x.id),
          detail: [
            augCategories[a?.category ?? ''],
            x.rating ? `Nível ${x.rating}` : '',
            nameOf(c.grades, x.grade ?? 'standard'),
          ]
            .filter(Boolean)
            .join(' · '),
        }
      }),
    },
    {
      title: 'Eletrônicos',
      items: (r.devices ?? []).map((x) => ({
        key: x.key,
        name: gearName(c, x.id),
        detail: x.kind === 'commlink' ? 'Com-link' : 'Ciberdeck',
      })),
    },
    {
      title: 'Veículos',
      items: (r.vehicles ?? []).map((x) => ({ key: x.key, name: gearName(c, x.id), detail: '' })),
    },
    {
      title: 'Outros',
      items: (r.other ?? []).map((x) => ({
        key: x.key,
        name: x.name || 'Item',
        detail: (x.quantity ?? 1) > 1 ? `${x.quantity} unidades` : '',
      })),
    },
  ].filter((g) => g.items.length)
})

const magic = computed(() => {
  const m = sheet.value.magic ?? {}
  const named = (list: { id: string; name: string }[], ids: string[] = []) =>
    ids.map((id) => nameOf(list, id))
  return [
    { title: 'Tradição', items: m.tradition ? [nameOf(c.traditions, m.tradition)] : [] },
    { title: 'Feitiços', items: named(c.spells, m.formulas?.spells) },
    { title: 'Rituais', items: named(c.rituals, m.formulas?.rituals) },
    {
      title: 'Poderes de adepto',
      items: (m.powers ?? []).map(
        (p) => `${nameOf(c.adeptPowers, p.id)}${p.rating ? ` ${p.rating}` : ''}`,
      ),
    },
    { title: 'Formas complexas', items: named(c.complexForms, m.complexForms) },
    {
      title: 'Espíritos vinculados',
      items: (m.spirits ?? []).map(
        (s) => `${nameOf(c.spiritTypes, s.type)}, ${s.services} serviços`,
      ),
    },
    {
      title: 'Sprites registrados',
      items: (m.sprites ?? []).map((s) => `${nameOf(c.spriteTypes, s.type)}, ${s.tasks} tarefas`),
    },
  ].filter((g) => g.items.length)
})
</script>

<template>
  <NxBar back="/" back-label="Voltar para personagens">
    <div class="heading">
      <h1>{{ identity.name || 'Sem nome' }}</h1>
      <RouterLink class="edit" :to="`${base}/concept`">Editar</RouterLink>
    </div>
  </NxBar>

  <IonContent>
    <main class="content">
      <section v-if="tab === 'summary'" class="panel">
        <article class="sin" aria-label="Cartão SIN">
          <span class="kicker">SIN</span>
          <strong class="who">{{ identity.name || 'Sem nome' }}</strong>
          <span class="what">
            {{
              [nameOf(c.metatypes, sheet.metatype), identity.concept].filter(Boolean).join(' · ')
            }}
          </span>
        </article>
        <p v-if="warnings.length" class="warning">
          {{ warnings.length }} aviso(s) do livro. A ficha continua valendo; revise ao editar.
        </p>

        <h2>Condição</h2>
        <div v-for="m in ['physical', 'stun'] as const" :key="m" class="monitor">
          <span class="label">{{ m === 'physical' ? 'Físico' : 'Atordoamento' }}</span>
          <span class="boxes" :aria-label="`${derived?.monitors?.[m]} caixas`">
            <span v-for="(_, i) in boxes(derived?.monitors?.[m])" :key="i" />
          </span>
        </div>
        <p class="line">
          Trunfo <strong class="numeric">{{ attr('edg')?.natural ?? 0 }}</strong> · Essência
          <strong class="numeric">{{ decimal(derived?.essence ?? 0) }}</strong>
          <template v-if="awakened">
            · {{ awakened }}
            <strong class="numeric">{{
              attr(awakened === 'Magia' ? 'mag' : 'res')?.natural
            }}</strong>
          </template>
        </p>

        <h2>Atributos</h2>
        <dl class="attrs">
          <div v-for="id in grid" :key="id">
            <dt>{{ abbr(id) }}</dt>
            <dd class="numeric">
              {{ attr(id)?.natural }}
              <span v-if="attr(id) && attr(id)!.augmented !== attr(id)!.natural" class="aug">
                ({{ attr(id)!.augmented }})
              </span>
            </dd>
          </div>
        </dl>

        <h2>Limites e iniciativa</h2>
        <dl class="stats">
          <div>
            <dt>Físico</dt>
            <dd class="numeric">{{ derived?.limits?.physical }}</dd>
          </div>
          <div>
            <dt>Mental</dt>
            <dd class="numeric">{{ derived?.limits?.mental }}</dd>
          </div>
          <div>
            <dt>Social</dt>
            <dd class="numeric">{{ derived?.limits?.social }}</dd>
          </div>
          <div>
            <dt>Iniciativa</dt>
            <dd class="numeric">
              {{ derived?.initiative?.physical?.base }} +
              {{ derived?.initiative?.physical?.dice }}D6
            </dd>
          </div>
          <div>
            <dt>Armadura</dt>
            <dd class="numeric">{{ derived?.armor }}</dd>
          </div>
          <div>
            <dt>Nuyen inicial</dt>
            <dd class="numeric">{{ yen(derived?.startingNuyen ?? 0) }}</dd>
          </div>
        </dl>
      </section>

      <section v-else-if="tab === 'skills'" class="panel">
        <h2>Ativas</h2>
        <ul class="list">
          <li v-for="s in active" :key="s.id">
            <span>{{ s.name }}</span>
            <span class="numeric"
              >{{ s.rating }}<span v-if="s.pool" class="pool">{{ s.pool }}</span></span
            >
          </li>
        </ul>
        <h2>Conhecimento e idiomas</h2>
        <ul class="list">
          <li v-for="k in [...knowledge, ...languages]" :key="k.key">
            <span>{{ k.name }}</span>
            <span class="numeric"
              >{{ 'native' in k && k.native ? 'N' : k.rating
              }}<span v-if="'pool' in k && k.pool" class="pool">{{ k.pool }}</span></span
            >
          </li>
        </ul>
      </section>

      <section v-else-if="tab === 'gear'" class="panel">
        <template v-for="g in gear" :key="g.title">
          <h2>{{ g.title }}</h2>
          <ul class="list">
            <li v-for="x in g.items" :key="x.key">
              <span class="stack">
                <span>{{ x.name }}</span>
                <span v-if="x.detail" class="detail">{{ x.detail }}</span>
              </span>
            </li>
          </ul>
        </template>
        <p v-if="!gear.length" class="line">Nenhum equipamento.</p>
      </section>

      <section v-else-if="tab === 'contacts'" class="panel">
        <ul class="list">
          <li v-for="ct in sheet.contacts ?? []" :key="ct.key">
            <span class="stack">
              <span>{{ ct.name || 'Contato sem nome' }}</span>
              <span v-if="ct.notes" class="detail">{{ ct.notes }}</span>
            </span>
            <span class="numeric">C{{ ct.connection ?? 1 }} · L{{ ct.loyalty ?? 1 }}</span>
          </li>
        </ul>
        <p v-if="!(sheet.contacts ?? []).length" class="line">Nenhum contato.</p>
      </section>

      <section v-else class="panel">
        <template v-for="g in magic" :key="g.title">
          <h2>{{ g.title }}</h2>
          <ul class="list">
            <li v-for="x in g.items" :key="x">{{ x }}</li>
          </ul>
        </template>
      </section>
    </main>
  </IonContent>

  <IonFooter class="ion-no-border">
    <nav class="tabs" role="tablist" aria-label="Partes da ficha">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="tab === t.id"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </nav>
  </IonFooter>
</template>

<style scoped>
.heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
}

h1 {
  margin: 0;
  font-size: 1.125rem;
}

.edit {
  color: var(--sr-pen);
  font-weight: 600;
  font-size: var(--text-sm);
}

.content {
  padding: var(--space-4);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

h2 {
  margin: var(--space-2) 0 0;
  font-size: 1.0625rem;
  font-weight: 700;
}

.sin {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-4);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
}

.kicker {
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
}

.who {
  font-size: 1.375rem;
  color: var(--sr-pen);
}

.warning,
.line {
  margin: 0;
  font-size: var(--text-sm);
}

.monitor {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.label,
.detail {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.boxes {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.boxes span {
  width: 18px;
  height: 18px;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface-raised);
}

.attrs,
.stats {
  margin: 0;
  display: grid;
  gap: var(--space-2);
}

.attrs {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.stats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.attrs div,
.stats div {
  padding: var(--space-2);
  border: var(--border-width) solid var(--color-border);
  background: var(--color-surface-raised);
  text-align: center;
}

dt {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

dd {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--sr-print);
}

.aug {
  font-size: var(--text-sm);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.list li {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border-bottom: var(--border-width) solid var(--color-surface-sunken);
}

.stack {
  display: flex;
  flex-direction: column;
}

.pool {
  display: inline-block;
  margin-left: var(--space-3);
  padding-top: 2px;
  border-top: 2px solid var(--sr-print);
  color: var(--sr-print);
  font-weight: 700;
}

.tabs {
  display: flex;
  overflow-x: auto;
  background: var(--color-surface-raised);
  border-top: var(--border-width) solid var(--color-rule);
}

.tabs button {
  flex: 1 0 auto;
  min-height: 52px;
  padding: 0 var(--space-3);
  border: 0;
  border-top: 3px solid transparent;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}

.tabs button[aria-selected='true'] {
  border-top-color: var(--sr-pen);
  color: var(--sr-pen);
}
</style>
