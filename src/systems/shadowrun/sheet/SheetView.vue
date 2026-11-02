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
import EdgeHexes from '../ui/EdgeHexes.vue'
import SrPanel from '../ui/SrPanel.vue'

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
// Monitor como na ficha do livro: linhas de 3 caixas, com a penalidade de
// ferimento ao lado de cada linha.
const monitor = (n = 0) =>
  Array.from({ length: Math.ceil(n / 3) }, (_, row) => ({
    penalty: row + 1,
    cells: [0, 1, 2].map((col) => row * 3 + col < n),
  }))
const karmaLeft = computed(() => {
  const k = derived.value?.budgets.karma
  return k ? k.total - k.spent : undefined
})

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
            .join(', '),
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
      <h1><span aria-hidden="true">» </span>Ficha-base<span aria-hidden="true"> «</span></h1>
      <RouterLink class="edit" :to="`${base}/concept`">Editar</RouterLink>
    </div>
  </NxBar>

  <IonContent>
    <main class="content">
      <section v-if="tab === 'summary'" class="panel">
        <article class="sin" aria-label="Cartão SIN">
          <div class="sin-line">
            <span class="kicker">SIN</span>
            <span class="muted-dark">{{
              open.sheet.status === 'ready' ? 'Ficha pronta' : 'Rascunho'
            }}</span>
          </div>
          <strong class="who">{{ identity.name || 'Sem nome' }}</strong>
          <span class="what">
            {{ [nameOf(c.metatypes, sheet.metatype), identity.concept].filter(Boolean).join(', ') }}
          </span>
          <div class="sin-stats">
            <span
              >Essência <strong>{{ decimal(derived?.essence ?? 0) }}</strong></span
            >
            <span v-if="karmaLeft !== undefined"
              >Carma <strong>{{ karmaLeft }}</strong></span
            >
            <span v-if="derived?.startingNuyen !== undefined"
              >Nuyen <strong>{{ yen(derived.startingNuyen) }}</strong></span
            >
          </div>
        </article>
        <p v-if="warnings.length" class="warning">
          {{ warnings.length === 1 ? '1 aviso' : `${warnings.length} avisos` }} do livro. A ficha
          continua valendo; revise ao editar.
        </p>

        <SrPanel title="Condição">
          <div class="condition">
            <div v-for="m in ['physical', 'stun'] as const" :key="m" class="monitor">
              <span class="label">{{ m === 'physical' ? 'Físico' : 'Atordoamento' }}</span>
              <div class="grid" role="img" :aria-label="`${derived?.monitors?.[m]} caixas`">
                <template v-for="r in monitor(derived?.monitors?.[m])" :key="r.penalty">
                  <span v-for="(on, i) in r.cells" :key="i" :class="['box', { off: !on }]" />
                  <span class="penalty numeric">−{{ r.penalty }}</span>
                </template>
              </div>
            </div>
            <div class="monitor">
              <span class="label">Trunfo</span>
              <EdgeHexes
                class="edge"
                :value="attr('edg')?.natural ?? 0"
                :max="attr('edg')?.natural ?? 0"
                label="Trunfo"
              />
            </div>
          </div>
        </SrPanel>

        <section aria-label="Atributos" class="attrs">
          <div class="attrs-head">
            <span v-for="id in grid" :key="id">{{ abbr(id) }}</span>
          </div>
          <div class="attrs-values numeric">
            <span v-for="id in grid" :key="id">
              {{ attr(id)?.natural
              }}<span v-if="attr(id) && attr(id)!.augmented !== attr(id)!.natural" class="aug">
                ({{ attr(id)!.augmented }})</span
              >
            </span>
          </div>
        </section>

        <dl class="stats">
          <div>
            <dt>Limite Físico</dt>
            <dd class="numeric">{{ derived?.limits?.physical }}</dd>
          </div>
          <div>
            <dt>Limite Mental</dt>
            <dd class="numeric">{{ derived?.limits?.mental }}</dd>
          </div>
          <div>
            <dt>Limite Social</dt>
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
            <dt>Movimento</dt>
            <dd class="numeric">{{ derived?.movement?.walk }} / {{ derived?.movement?.run }} m</dd>
          </div>
        </dl>
        <p v-if="awakened" class="line">
          {{ awakened }}
          <strong class="numeric">{{ attr(awakened === 'Magia' ? 'mag' : 'res')?.natural }}</strong>
        </p>
      </section>

      <section v-else-if="tab === 'skills'" class="panel">
        <SrPanel title="Perícias ativas">
          <ul class="list">
            <li v-for="s in active" :key="s.id">
              <span class="item-name">{{ s.name }}</span>
              <span class="numeric rating"
                >{{ s.rating }}<span v-if="s.pool" class="pool">{{ s.pool }}</span></span
              >
            </li>
          </ul>
        </SrPanel>
        <SrPanel title="Conhecimento e idiomas">
          <ul class="list">
            <li v-for="k in [...knowledge, ...languages]" :key="k.key">
              <span class="item-name">{{ k.name }}</span>
              <span class="numeric rating"
                >{{ 'native' in k && k.native ? 'N' : k.rating
                }}<span v-if="'pool' in k && k.pool" class="pool">{{ k.pool }}</span></span
              >
            </li>
          </ul>
        </SrPanel>
      </section>

      <section v-else-if="tab === 'gear'" class="panel">
        <SrPanel v-for="g in gear" :key="g.title" :title="g.title">
          <ul class="list">
            <li v-for="x in g.items" :key="x.key">
              <span class="stack">
                <span class="item-name">{{ x.name }}</span>
                <span v-if="x.detail" class="detail">{{ x.detail }}</span>
              </span>
            </li>
          </ul>
        </SrPanel>
        <p v-if="!gear.length" class="line">Nenhum equipamento.</p>
      </section>

      <section v-else-if="tab === 'contacts'" class="panel">
        <SrPanel v-if="(sheet.contacts ?? []).length" title="Contatos">
          <ul class="list">
            <li v-for="ct in sheet.contacts ?? []" :key="ct.key">
              <span class="stack">
                <span class="item-name">{{ ct.name || 'Contato sem nome' }}</span>
                <span v-if="ct.notes" class="detail">{{ ct.notes }}</span>
              </span>
              <span class="numeric rating"
                >Conexão {{ ct.connection ?? 1 }}, Lealdade {{ ct.loyalty ?? 1 }}</span
              >
            </li>
          </ul>
        </SrPanel>
        <p v-else class="line">Nenhum contato.</p>
      </section>

      <section v-else class="panel">
        <SrPanel v-for="g in magic" :key="g.title" :title="g.title">
          <ul class="list">
            <li v-for="x in g.items" :key="x">
              <span class="item-name">{{ x }}</span>
            </li>
          </ul>
        </SrPanel>
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
}

.edit {
  min-height: var(--touch-min);
  display: flex;
  align-items: center;
  padding: 0 var(--space-2);
  color: var(--sr-amber);
  font-weight: 600;
  font-size: var(--text-sm);
}

.content {
  padding: var(--space-3) var(--space-4) var(--space-5);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Cartão SIN: ardósia com varredura de tela, como uma credencial lida num leitor. */
.sin {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-4) 18px;
  background-color: var(--sr-slate);
  background-image: repeating-linear-gradient(
    0deg,
    rgb(255 255 255 / 3.5%) 0 1px,
    transparent 1px 4px
  );
  color: var(--sr-on-dark);
  clip-path: var(--sr-chamfer-large);
}

.sin-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-family: var(--font-numeric);
  font-size: 0.9375rem;
}

.kicker {
  font-weight: 600;
  color: var(--sr-amber);
}

.muted-dark {
  color: var(--sr-on-dark-muted);
}

.who {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 1.5rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.what {
  font-size: var(--text-sm);
}

.sin-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  margin-top: 4px;
  font-family: var(--font-numeric);
  font-size: 1.0625rem;
  color: var(--sr-on-dark-muted);
}

.sin-stats strong {
  color: var(--sr-on-dark);
}

.warning,
.line {
  margin: 0;
  font-size: var(--text-sm);
}

.condition {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  padding: var(--space-3) 0;
}

.monitor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-family: var(--font-numeric);
  font-size: 1rem;
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 22px) 26px;
  gap: 3px;
  align-items: center;
}

.box {
  height: 22px;
  border: 1px solid var(--sr-carmine);
  background: var(--color-surface-raised);
}

.box.off {
  border: 0;
  background: transparent;
}

.penalty {
  padding-left: 4px;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--sr-carmine);
}

.edge {
  max-width: 44px;
}

/* Faixa de atributos do bloco de arquétipo do livro. */
.attrs {
  display: flex;
  flex-direction: column;
  font-family: var(--font-numeric);
  text-align: center;
}

.attrs-head,
.attrs-values {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
}

.attrs-head {
  padding: 5px 0;
  background: var(--sr-coal);
  color: var(--sr-amber);
  font-size: 0.9375rem;
  font-weight: 600;
}

.attrs-values {
  padding: 6px 0;
  background: var(--sr-slate-2);
  color: var(--sr-on-dark);
  font-size: 1.3125rem;
  font-weight: 600;
}

.aug {
  font-size: 0.9375rem;
  color: var(--sr-amber);
}

.stats {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.stats div {
  padding: var(--space-2) 10px;
  background: var(--color-surface-raised);
  box-shadow: inset 0 0 0 1px var(--color-rule);
  clip-path: var(--sr-chamfer-small);
}

dt {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

dd {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 600;
}

.list {
  margin: 0 calc(-1 * var(--space-3));
  padding: 0;
  list-style: none;
}

.list li {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-1) var(--space-3);
}

.list li:nth-child(even) {
  background: var(--sr-zebra);
}

.item-name {
  font-family: var(--font-numeric);
  font-size: 1.125rem;
  font-weight: 600;
}

.stack {
  display: flex;
  flex-direction: column;
}

.detail {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.rating {
  font-size: 1.125rem;
  font-weight: 600;
  white-space: nowrap;
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
  background: var(--sr-coal);
}

.tabs button {
  flex: 1 1 0;
  min-width: 0;
  min-height: 52px;
  padding: 0 2px;
  border: 0;
  border-top: 3px solid transparent;
  background: transparent;
  color: #a3a6ac;
  font-family: var(--font-numeric);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.tabs button[aria-selected='true'] {
  border-top-color: var(--sr-carmine-bright);
  color: var(--sr-on-dark);
}
</style>
