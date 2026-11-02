<script setup lang="ts">
import { computed, ref } from 'vue'

import type { Violation } from '@/core/rules/system'
import NxButton from '@/core/ui/NxButton.vue'
import type { Derived } from '../rules'
import { augPart, deckAttrs, gearCalc, ratingOf, type ResourcesData } from '../rules/resources'
import type { Sheet } from '../rules/validate'
import NumberStepper from '../ui/NumberStepper.vue'
import NuyenBar from '../ui/NuyenBar.vue'
import PickerSheet, { type PickerItem } from '../ui/PickerSheet.vue'
import { nameOf, useCatalogs } from './catalogs'
import type { Edit } from './edit'
import { useFooter } from './footer'
import { newKey } from './keys'
import {
  augCategories,
  capacityOf,
  decimal,
  gearName,
  hostsFor,
  type ListName,
  pickerItems,
  resourceMessage,
  yen,
} from './resources'

const props = defineProps<{
  data: Record<string, unknown>
  edit: Edit
  derived?: Derived
  violations: Violation[]
}>()

const c = useCatalogs()
const res = computed(() => (props.data.resources ?? {}) as ResourcesData)
const gear = computed(() => gearCalc(c.lookup, c.mechanics, props.data as Sheet))
const nuyen = computed(() => props.derived?.budgets.nuyen)
const k2n = computed(() => props.derived?.budgets.karmaToNuyen)
const rate = c.mechanics.creation.resources.karmaToNuyen.rate
const awakened = computed(() => {
  const a = props.derived?.attributes
  if (a?.mag) return { name: 'Magia', value: a.mag.natural }
  if (a?.res) return { name: 'Ressonância', value: a.res.natural }
  return undefined
})

const expanded = ref<string>()
const picking = ref<ListName>()

type Item = { key: string; id?: string }

const sections: { list: ListName; title: string; add: string; picker: boolean }[] = [
  { list: 'lifestyles', title: 'Estilo de vida', add: 'Adicionar estilo de vida', picker: true },
  { list: 'identities', title: 'Identidades', add: 'Adicionar SIN falso', picker: false },
  { list: 'weapons', title: 'Armas', add: 'Adicionar arma', picker: true },
  { list: 'armor', title: 'Armadura', add: 'Adicionar armadura', picker: true },
  { list: 'augmentations', title: 'Ampliações', add: 'Adicionar ampliação', picker: true },
  { list: 'devices', title: 'Eletrônicos', add: 'Adicionar com-link ou ciberdeck', picker: true },
  { list: 'vehicles', title: 'Veículos', add: 'Adicionar veículo', picker: true },
  { list: 'other', title: 'Outros itens', add: 'Adicionar outro item', picker: false },
]

// Violações por item, para marcar a linha e explicar abaixo do nome.
const problems = computed(() => {
  const out = new Map<string, string>()
  for (const v of props.violations) {
    const key = /^resources\.\w+\[([^\]]+)\]/.exec(v.path)?.[1]
    if (key && !out.has(key)) out.set(key, resourceMessage(c, v))
  }
  return out
})
const general = computed(() =>
  props.violations
    .filter((v) => !/^resources\.\w+\[/.test(v.path))
    .map((v) => resourceMessage(c, v)),
)

function change<T extends Item>(list: ListName, key: string, update: (it: T) => void) {
  props.edit((data) => {
    const r = { ...((data.resources as ResourcesData | undefined) ?? {}) }
    const items = structuredClone((r[list] ?? []) as T[])
    update(items.find((x) => x.key === key)!)
    Object.assign(r, { [list]: items })
    data.resources = r
  })
}

function setField(field: 'karmaToNuyen', value: number) {
  props.edit((data) => {
    const r = { ...((data.resources as ResourcesData | undefined) ?? {}) }
    if (value > 0) r[field] = value
    else delete r[field]
    data.resources = r
  })
}

function remove(list: ListName, key: string) {
  props.edit((data) => {
    const r = { ...((data.resources as ResourcesData | undefined) ?? {}) }
    const items = ((r[list] ?? []) as Item[]).filter((x) => x.key !== key)
    if (items.length > 0) Object.assign(r, { [list]: items })
    else delete r[list]
    data.resources = r
  })
  expanded.value = undefined
}

function append(list: ListName, item: Item) {
  props.edit((data) => {
    const r = { ...((data.resources as ResourcesData | undefined) ?? {}) }
    Object.assign(r, { [list]: [...((r[list] ?? []) as Item[]), item] })
    data.resources = r
  })
  picking.value = undefined
  expanded.value = item.key
}

function add(list: ListName, id?: string) {
  const key = newKey(props.data)
  switch (list) {
    case 'lifestyles':
      return append(list, {
        key,
        id,
        ...((res.value.lifestyles ?? []).some((l) => l.primary) ? {} : { primary: true }),
      } as Item)
    case 'identities':
      return append(list, { key, name: '', rating: 1 } as Item)
    case 'other':
      return append(list, { key, name: '', cost: 0 } as Item)
    case 'devices': {
      const [kind, deviceId] = id!.split(':') as ['commlink' | 'cyberdeck', string]
      return append(list, { key, kind, id: deviceId } as Item)
    }
    case 'augmentations': {
      const a = c.augmentations.find((x) => x.id === id)!
      return append(list, {
        key,
        id,
        ...(a.rating ? { rating: a.rating.min } : {}),
        ...(a.variants?.length ? { variant: a.variants[0]!.id } : {}),
      } as Item)
    }
    default:
      return append(list, { key, id } as Item)
  }
}

function addLicense(identity: string) {
  const key = newKey(props.data)
  change<NonNullable<ResourcesData['identities']>[number]>('identities', identity, (it) => {
    it.licenses = [...(it.licenses ?? []), { key, name: '', rating: 1 }]
  })
}

function addModification(armor: string, id: string) {
  const key = newKey(props.data)
  const mod = c.armorModifications.find((m) => m.id === id)!
  change<NonNullable<ResourcesData['armor']>[number]>('armor', armor, (it) => {
    it.modifications = [
      ...(it.modifications ?? []),
      { key, id, ...(mod.rating ? { rating: mod.rating.min } : {}) },
    ]
  })
}

const toggle = (xs: string[] | undefined, id: string, on: boolean) => {
  const out = (xs ?? []).filter((x) => x !== id)
  return on ? [...out, id] : out
}

const pickerList = computed<(PickerItem & { list: ListName })[]>(() =>
  picking.value ? pickerItems(c, picking.value).map((x) => ({ ...x, list: picking.value! })) : [],
)
const pickerTitle = computed(
  () => sections.find((s) => s.list === picking.value)?.title ?? 'Equipamento',
)

const cost = (key: string) => yen(gear.value.items[key]?.nuyen ?? 0)
const essenceOf = (key: string) => gear.value.items[key]?.essence

// Linha de cada item: nome, detalhe e o que dá para mudar.
const rows = computed(() => {
  const r = res.value
  const months = (n = 1) => `${n} ${n === 1 ? 'mês' : 'meses'}`
  const licenses = (n: number) =>
    n === 0 ? 'sem licença' : `${n} ${n === 1 ? 'licença' : 'licenças'}`
  return {
    lifestyles: (r.lifestyles ?? []).map((l) => ({
      it: l,
      name: gearName(c, l.id),
      detail: [
        months(l.months),
        l.primary ? 'principal' : '',
        ...(l.options ?? []).map((o) => nameOf(c.lifestyleOptions, o)),
      ]
        .filter(Boolean)
        .join(' · '),
    })),
    identities: (r.identities ?? []).map((i) => ({
      it: i,
      name: i.name || 'SIN sem nome',
      detail: `Nível ${i.rating ?? 1} · ${licenses(i.licenses?.length ?? 0)}`,
    })),
    weapons: (r.weapons ?? []).map((w) => {
      const cat = c.weapons.find((x) => x.id === w.id)
      return {
        it: w,
        name: gearName(c, w.id),
        detail: [
          nameOf(c.weaponCategories, cat?.category),
          cat?.rating ? `Nível ${ratingOf(w.rating, cat.rating)}` : '',
          (w.quantity ?? 1) > 1 ? `${w.quantity} unidades` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      }
    }),
    armor: (r.armor ?? []).map((a) => ({
      it: a,
      name: gearName(c, a.id),
      detail:
        [
          ...(a.options ?? []).map((o) =>
            c.armor.find((x) => x.id === a.id)?.options?.find((y) => y.id === o),
          ),
          ...(a.modifications ?? []).map((m) => c.armorModifications.find((x) => x.id === m.id)),
        ]
          .map((x) => (x as { name?: string } | undefined)?.name)
          .filter(Boolean)
          .join(' · ') || 'Sem opções',
    })),
    augmentations: (r.augmentations ?? []).map((a) => {
      const cat = c.augmentations.find((x) => x.id === a.id)
      const e = essenceOf(a.key)
      const host = a.installedIn && r.augmentations?.find((h) => h.key === a.installedIn)
      return {
        it: a,
        name: gearName(c, a.id),
        detail: [
          nameOf(c.grades, a.grade ?? 'standard'),
          cat?.rating ? `Nível ${ratingOf(a.rating, cat.rating)}` : '',
          cat?.variants?.find((v) => v.id === a.variant)?.name,
          host
            ? `em ${gearName(c, host.id)}`
            : e !== undefined
              ? `Essência ${decimal(e / 1000)}`
              : '',
        ]
          .filter(Boolean)
          .join(' · '),
      }
    }),
    devices: (r.devices ?? []).map((d) => {
      const cat = (d.kind === 'commlink' ? c.commlinks : c.cyberdecks).find((x) => x.id === d.id)
      return {
        it: d,
        name: gearName(c, d.id),
        detail: `${d.kind === 'commlink' ? 'Com-link' : 'Ciberdeck'} · Nível ${cat?.deviceRating ?? '?'}`,
      }
    }),
    vehicles: (r.vehicles ?? []).map((v) => ({
      it: v,
      name: gearName(c, v.id),
      detail: nameOf(c.vehicleCategories, c.vehicles.find((x) => x.id === v.id)?.category),
    })),
    other: (r.other ?? []).map((o) => ({
      it: o,
      name: o.name || 'Item sem nome',
      detail: (o.quantity ?? 1) > 1 ? `${o.quantity} unidades` : 'Fora do catálogo',
    })),
  } as unknown as Record<
    ListName,
    { it: Item & Record<string, unknown>; name: string; detail: string }[]
  >
})

const deckAttrNames: Record<string, string> = {
  attack: 'Ataque',
  sleaze: 'Subversão',
  dataProcessing: 'Datagrama',
  firewall: 'Firewall',
}
const grades = c.mechanics.creation.resources.grades

const text = (e: Event) => (e.target as HTMLInputElement).value
const integer = (e: Event) => Math.max(0, Math.trunc(Number(text(e)) || 0))

useFooter({
  status: computed(() =>
    nuyen.value ? `Nuyen: ${yen(nuyen.value.total - nuyen.value.spent)} restantes` : '',
  ),
  alert: computed(() => {
    const v = props.violations[0]
    return v ? resourceMessage(c, v) : ''
  }),
})
</script>

<template>
  <div class="sticky">
    <NuyenBar v-if="nuyen" :total="nuyen.total" :spent="nuyen.spent" />
    <p v-else class="intro">Escolha a prioridade de Recursos para ter nuyen a gastar.</p>
    <p v-if="derived?.essence !== undefined" class="essence">
      <span
        >Essência <strong class="numeric">{{ decimal(derived.essence) }}</strong></span
      >
      <span v-if="awakened" class="muted">
        {{ awakened.name }} <span class="numeric">{{ awakened.value }}</span>
      </span>
    </p>
  </div>

  <section v-if="k2n" class="side">
    <h2>Carma em nuyen</h2>
    <p class="intro">
      Cada ponto de carma vira {{ yen(rate) }}, até {{ k2n.total }}. O carma convertido sai do que
      sobra para o passo 7.
    </p>
    <NumberStepper
      label="carma convertido"
      :value="res.karmaToNuyen ?? 0"
      :min="0"
      :max="k2n.total"
      @change="setField('karmaToNuyen', $event)"
    />
  </section>

  <p v-for="m in general" :key="m" class="problem general">{{ m }}</p>

  <section v-for="s in sections" :key="s.list" class="side">
    <h2>{{ s.title }}</h2>
    <ul>
      <li
        v-for="row in rows[s.list]"
        :key="row.it.key"
        :class="{ flagged: problems.has(row.it.key) }"
      >
        <button
          type="button"
          class="row"
          :aria-expanded="expanded === row.it.key"
          @click="expanded = expanded === row.it.key ? undefined : row.it.key"
        >
          <span class="text">
            <span class="name">{{ row.name }}</span>
            <span class="detail">{{ row.detail }}</span>
            <span v-if="problems.has(row.it.key)" class="problem">{{
              problems.get(row.it.key)
            }}</span>
          </span>
          <span class="numeric price">{{ cost(row.it.key) }}</span>
        </button>

        <div v-if="expanded === row.it.key" class="editor">
          <!-- Estilo de vida -->
          <template v-if="s.list === 'lifestyles'">
            <div class="field">
              <span class="label">Meses pagos</span>
              <NumberStepper
                :label="`meses de ${row.name}`"
                :value="Number(row.it.months ?? 1)"
                :min="1"
                @change="
                  change(s.list, row.it.key, (x: Item & { months?: number }) => (x.months = $event))
                "
              />
            </div>
            <label class="check">
              <input
                type="checkbox"
                :checked="!!row.it.primary"
                @change="
                  change(s.list, row.it.key, (x: Item & { primary?: boolean }) => {
                    if (($event.target as HTMLInputElement).checked) x.primary = true
                    else delete x.primary
                  })
                "
              />
              Estilo de vida principal (define o nuyen inicial)
            </label>
            <fieldset class="field">
              <legend class="label">Opções</legend>
              <label v-for="o in c.lifestyleOptions" :key="o.id" class="check">
                <input
                  type="checkbox"
                  :checked="(row.it.options as string[] | undefined)?.includes(o.id)"
                  @change="
                    change(s.list, row.it.key, (x: Item & { options?: string[] }) => {
                      x.options = toggle(
                        x.options,
                        o.id,
                        ($event.target as HTMLInputElement).checked,
                      )
                      if (!x.options.length) delete x.options
                    })
                  "
                />
                {{ o.name }}
                <span class="numeric muted">{{
                  o.cost.percent !== undefined
                    ? `${o.cost.percent > 0 ? '+' : ''}${o.cost.percent}%`
                    : `+${yen(o.cost.add ?? 0)}`
                }}</span>
              </label>
            </fieldset>
          </template>

          <!-- Identidade -->
          <template v-else-if="s.list === 'identities'">
            <div class="field">
              <label class="label" :for="`${row.it.key}-name`">Nome no SIN</label>
              <input
                :id="`${row.it.key}-name`"
                type="text"
                :value="row.it.name"
                @change="
                  change(
                    s.list,
                    row.it.key,
                    (x: Item & { name?: string }) => (x.name = text($event)),
                  )
                "
              />
            </div>
            <div class="field">
              <span class="label">Nível do SIN</span>
              <NumberStepper
                label="nível do SIN"
                :value="Number(row.it.rating ?? 1)"
                :min="1"
                :max="6"
                @change="
                  change(s.list, row.it.key, (x: Item & { rating?: number }) => (x.rating = $event))
                "
              />
            </div>
            <div
              v-for="lc in (row.it.licenses as
                { key: string; name?: string; rating?: number }[] | undefined) ?? []"
              :key="lc.key"
              :class="['license', { flagged: problems.has(lc.key) }]"
            >
              <label class="label" :for="`${lc.key}-name`">Licença</label>
              <input
                :id="`${lc.key}-name`"
                type="text"
                placeholder="Porte de arma, magia, motorista…"
                :value="lc.name ?? ''"
                @change="
                  change(s.list, row.it.key, (x: Item & { licenses?: (typeof lc)[] }) => {
                    x.licenses!.find((y) => y.key === lc.key)!.name = text($event)
                  })
                "
              />
              <NumberStepper
                :label="`nível da licença ${lc.name || ''}`"
                :value="lc.rating ?? 1"
                :min="1"
                :max="6"
                @change="
                  change(s.list, row.it.key, (x: Item & { licenses?: (typeof lc)[] }) => {
                    x.licenses!.find((y) => y.key === lc.key)!.rating = $event
                  })
                "
              />
              <NxButton
                variant="text"
                class="remove"
                @click="
                  change(s.list, row.it.key, (x: Item & { licenses?: (typeof lc)[] }) => {
                    x.licenses = x.licenses!.filter((y) => y.key !== lc.key)
                    if (!x.licenses.length) delete x.licenses
                  })
                "
                >Remover licença</NxButton
              >
            </div>
            <button type="button" class="add" @click="addLicense(row.it.key)">
              Adicionar licença falsa
            </button>
          </template>

          <!-- Arma -->
          <template v-else-if="s.list === 'weapons'">
            <div v-if="c.weapons.find((x) => x.id === row.it.id)?.rating" class="field">
              <span class="label">Nível</span>
              <NumberStepper
                :label="`nível de ${row.name}`"
                :value="
                  ratingOf(
                    row.it.rating as number | undefined,
                    c.weapons.find((x) => x.id === row.it.id)?.rating,
                  )
                "
                :min="c.weapons.find((x) => x.id === row.it.id)!.rating!.min"
                :max="c.weapons.find((x) => x.id === row.it.id)!.rating!.max"
                @change="
                  change(s.list, row.it.key, (x: Item & { rating?: number }) => (x.rating = $event))
                "
              />
            </div>
            <div class="field">
              <span class="label">Quantidade</span>
              <NumberStepper
                :label="`quantidade de ${row.name}`"
                :value="Number(row.it.quantity ?? 1)"
                :min="1"
                @change="
                  change(s.list, row.it.key, (x: Item & { quantity?: number }) => {
                    if ($event > 1) x.quantity = $event
                    else delete x.quantity
                  })
                "
              />
            </div>
          </template>

          <!-- Armadura -->
          <template v-else-if="s.list === 'armor'">
            <div
              v-if="typeof c.armor.find((x) => x.id === row.it.id)?.cost === 'object'"
              class="field"
            >
              <label class="label" :for="`${row.it.key}-cost`">Preço pago (¥)</label>
              <input
                :id="`${row.it.key}-cost`"
                type="number"
                inputmode="numeric"
                min="0"
                :value="row.it.cost ?? ''"
                @change="
                  change(
                    s.list,
                    row.it.key,
                    (x: Item & { cost?: number }) => (x.cost = integer($event)),
                  )
                "
              />
            </div>
            <fieldset v-if="c.armor.find((x) => x.id === row.it.id)?.options?.length" class="field">
              <legend class="label">Opções</legend>
              <label
                v-for="o in c.armor.find((x) => x.id === row.it.id)!.options"
                :key="o.id"
                class="check"
              >
                <input
                  type="checkbox"
                  :checked="(row.it.options as string[] | undefined)?.includes(o.id)"
                  @change="
                    change(s.list, row.it.key, (x: Item & { options?: string[] }) => {
                      x.options = toggle(
                        x.options,
                        o.id,
                        ($event.target as HTMLInputElement).checked,
                      )
                      if (!x.options.length) delete x.options
                    })
                  "
                />
                {{ (o as { name?: string }).name }}
              </label>
            </fieldset>
            <div
              v-for="m in (row.it.modifications as
                { key: string; id: string; rating?: number }[] | undefined) ?? []"
              :key="m.key"
              class="license"
            >
              <span class="label">{{ gearName(c, m.id) }}</span>
              <NumberStepper
                v-if="c.armorModifications.find((x) => x.id === m.id)?.rating"
                :label="`nível de ${gearName(c, m.id)}`"
                :value="m.rating ?? 1"
                :min="1"
                :max="6"
                @change="
                  change(s.list, row.it.key, (x: Item & { modifications?: (typeof m)[] }) => {
                    x.modifications!.find((y) => y.key === m.key)!.rating = $event
                  })
                "
              />
              <NxButton
                variant="text"
                class="remove"
                @click="
                  change(s.list, row.it.key, (x: Item & { modifications?: (typeof m)[] }) => {
                    x.modifications = x.modifications!.filter((y) => y.key !== m.key)
                    if (!x.modifications.length) delete x.modifications
                  })
                "
                >Remover modificação</NxButton
              >
            </div>
            <div class="field">
              <label class="label" :for="`${row.it.key}-mod`">Modificação</label>
              <select
                :id="`${row.it.key}-mod`"
                value=""
                @change="
                  ($event.target as HTMLSelectElement).value &&
                  addModification(row.it.key, ($event.target as HTMLSelectElement).value)
                "
              >
                <option value="">Adicionar modificação…</option>
                <option v-for="m in c.armorModifications" :key="m.id" :value="m.id">
                  {{ m.name }}
                </option>
              </select>
            </div>
          </template>

          <!-- Ampliação -->
          <template v-else-if="s.list === 'augmentations'">
            <template v-for="a in [c.augmentations.find((x) => x.id === row.it.id)]" :key="a?.id">
              <template v-if="a">
                <div class="field">
                  <label class="label" :for="`${row.it.key}-grade`">Grau</label>
                  <select
                    :id="`${row.it.key}-grade`"
                    :value="row.it.grade ?? 'standard'"
                    @change="
                      change(s.list, row.it.key, (x: Item & { grade?: string }) => {
                        const v = ($event.target as HTMLSelectElement).value
                        if (v === 'standard') delete x.grade
                        else x.grade = v
                      })
                    "
                  >
                    <option v-for="g in c.grades" :key="g.id" :value="g.id">
                      {{ g.name }}{{ grades.includes(g.id) ? '' : ' (fora da criação)' }}
                    </option>
                  </select>
                </div>
                <div v-if="a.rating" class="field">
                  <span class="label">Nível</span>
                  <NumberStepper
                    :label="`nível de ${row.name}`"
                    :value="ratingOf(row.it.rating as number | undefined, a.rating)"
                    :min="a.rating.min"
                    :max="a.rating.max"
                    @change="
                      change(
                        s.list,
                        row.it.key,
                        (x: Item & { rating?: number }) => (x.rating = $event),
                      )
                    "
                  />
                </div>
                <fieldset v-if="a.variants?.length" class="field">
                  <legend class="label">Modelo</legend>
                  <label v-for="v in a.variants" :key="v.id" class="check">
                    <input
                      type="radio"
                      :name="`${row.it.key}-variant`"
                      :checked="row.it.variant === v.id"
                      @change="
                        change(
                          s.list,
                          row.it.key,
                          (x: Item & { variant?: string }) => (x.variant = v.id),
                        )
                      "
                    />
                    {{ (v as { name?: string }).name }}
                  </label>
                </fieldset>
                <div v-if="a.parameter" class="field">
                  <label class="label" :for="`${row.it.key}-param`">Perícia</label>
                  <select
                    :id="`${row.it.key}-param`"
                    :value="row.it.parameter ?? ''"
                    @change="
                      change(s.list, row.it.key, (x: Item & { parameter?: string }) => {
                        const v = ($event.target as HTMLSelectElement).value
                        if (v) x.parameter = v
                        else delete x.parameter
                      })
                    "
                  >
                    <option value="">Escolha…</option>
                    <option v-for="sk in c.skills" :key="sk.id" :value="sk.id">
                      {{ sk.name }}
                    </option>
                  </select>
                </div>
                <div
                  v-if="capacityOf(augPart(a, row.it as never)).cost !== undefined"
                  class="field"
                >
                  <label class="label" :for="`${row.it.key}-host`">Instalado em</label>
                  <select
                    :id="`${row.it.key}-host`"
                    :value="row.it.installedIn ?? ''"
                    @change="
                      change(s.list, row.it.key, (x: Item & { installedIn?: string }) => {
                        const v = ($event.target as HTMLSelectElement).value
                        if (v) x.installedIn = v
                        else delete x.installedIn
                      })
                    "
                  >
                    <option value="">Direto no corpo</option>
                    <option
                      v-for="h in hostsFor(c, res, a, row.it.key)"
                      :key="h.key"
                      :value="h.key"
                    >
                      {{ h.name }}
                    </option>
                  </select>
                </div>
                <p class="muted small">
                  {{ augCategories[a.category] ?? a.category }}. Instalado em outro implante, ocupa
                  capacidade e não gasta Essência.
                </p>
              </template>
            </template>
          </template>

          <!-- Eletrônico -->
          <template v-else-if="s.list === 'devices'">
            <fieldset v-if="row.it.kind === 'commlink'" class="field">
              <legend class="label">Opções</legend>
              <label v-for="o in c.commlinkOptions" :key="o.id" class="check">
                <input
                  type="checkbox"
                  :checked="(row.it.options as string[] | undefined)?.includes(o.id)"
                  @change="
                    change(s.list, row.it.key, (x: Item & { options?: string[] }) => {
                      x.options = toggle(
                        x.options,
                        o.id,
                        ($event.target as HTMLInputElement).checked,
                      )
                      if (!x.options.length) delete x.options
                    })
                  "
                />
                {{ o.name }}
              </label>
            </fieldset>
            <template v-else>
              <fieldset class="field">
                <legend class="label">
                  Atributos do deck ({{
                    c.cyberdecks.find((x) => x.id === row.it.id)?.attributeArray?.join(', ')
                  }})
                </legend>
                <div class="array">
                  <label v-for="k in deckAttrs" :key="k" class="cell">
                    <span class="label">{{ deckAttrNames[k] }}</span>
                    <select
                      :value="(row.it.array as Record<string, number> | undefined)?.[k] ?? ''"
                      @change="
                        change(
                          s.list,
                          row.it.key,
                          (x: Item & { array?: Record<string, number> }) => {
                            x.array = {
                              ...x.array,
                              [k]: Number(($event.target as HTMLSelectElement).value),
                            }
                          },
                        )
                      "
                    >
                      <option value="" disabled>—</option>
                      <option
                        v-for="(n, i) in c.cyberdecks.find((x) => x.id === row.it.id)
                          ?.attributeArray"
                        :key="i"
                        :value="n"
                      >
                        {{ n }}
                      </option>
                    </select>
                  </label>
                </div>
              </fieldset>
              <fieldset class="field">
                <legend class="label">Programas</legend>
                <label v-for="p in c.programs" :key="p.id" class="check">
                  <input
                    type="checkbox"
                    :checked="(row.it.programs as string[] | undefined)?.includes(p.id)"
                    @change="
                      change(s.list, row.it.key, (x: Item & { programs?: string[] }) => {
                        x.programs = toggle(
                          x.programs,
                          p.id,
                          ($event.target as HTMLInputElement).checked,
                        )
                        if (!x.programs.length) delete x.programs
                      })
                    "
                  />
                  {{ p.name }} <span class="numeric muted">{{ yen(Number(p.cost)) }}</span>
                </label>
              </fieldset>
            </template>
          </template>

          <!-- Outro item -->
          <template v-else-if="s.list === 'other'">
            <div class="field">
              <label class="label" :for="`${row.it.key}-name`">Nome</label>
              <input
                :id="`${row.it.key}-name`"
                type="text"
                placeholder="Munição, kit médico, granada…"
                :value="row.it.name"
                @change="
                  change(
                    s.list,
                    row.it.key,
                    (x: Item & { name?: string }) => (x.name = text($event)),
                  )
                "
              />
            </div>
            <div class="field">
              <label class="label" :for="`${row.it.key}-cost`">Preço de cada (¥)</label>
              <input
                :id="`${row.it.key}-cost`"
                type="number"
                inputmode="numeric"
                min="0"
                :value="row.it.cost ?? 0"
                @change="
                  change(
                    s.list,
                    row.it.key,
                    (x: Item & { cost?: number }) => (x.cost = integer($event)),
                  )
                "
              />
            </div>
            <div class="field">
              <span class="label">Quantidade</span>
              <NumberStepper
                :label="`quantidade de ${row.name}`"
                :value="Number(row.it.quantity ?? 1)"
                :min="1"
                @change="
                  change(s.list, row.it.key, (x: Item & { quantity?: number }) => {
                    if ($event > 1) x.quantity = $event
                    else delete x.quantity
                  })
                "
              />
            </div>
          </template>

          <NxButton variant="text" class="remove" @click="remove(s.list, row.it.key)"
            >Remover {{ row.name }}</NxButton
          >
        </div>
      </li>
    </ul>
    <button type="button" class="add" @click="s.picker ? (picking = s.list) : add(s.list)">
      {{ s.add }}
    </button>
  </section>

  <PickerSheet
    :open="!!picking"
    :title="pickerTitle"
    :subtitle="nuyen ? `${yen(nuyen.total - nuyen.spent)} restantes` : undefined"
    :items="pickerList"
    @close="picking = undefined"
  >
    <template #action="{ item }">
      <NxButton @click="add(item.list, item.id)">Adicionar por {{ item.price }}</NxButton>
    </template>
  </PickerSheet>
</template>

<style scoped>
/* O orçamento fica parado; a lista rola por baixo. */
.sticky {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  margin: calc(-1 * var(--space-5)) calc(-1 * var(--space-4)) var(--space-4);
  padding: 14px var(--space-4) var(--space-3);
  background: var(--color-surface);
  border-bottom: var(--border-width) solid var(--color-rule);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.essence {
  margin: 0;
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
}

.essence strong {
  font-size: 1.0625rem;
}

.intro {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
  max-width: 34em;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: var(--space-5);
}

h2 {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 700;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  border-bottom: var(--border-width) solid var(--color-surface-sunken);
}

.row {
  width: 100%;
  min-height: 60px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.text {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.name {
  font-size: var(--text-md);
  font-weight: 600;
  color: var(--sr-pen);
}

.detail,
.muted {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.small {
  margin: 0;
}

.problem {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-danger);
}

.general {
  margin: 0 0 var(--space-4);
}

.flagged .name {
  color: var(--color-danger);
}

.price {
  font-size: var(--text-sm);
  font-weight: 700;
  white-space: nowrap;
}

.editor {
  padding: 0 0 var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.field {
  margin: 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

.check {
  min-height: var(--touch-min);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.license {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-left: var(--space-3);
  border-left: 2px solid var(--color-surface-sunken);
}

.license.flagged {
  border-left-color: var(--color-danger);
}

.array {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.cell {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

select,
input[type='text'],
input[type='number'] {
  height: var(--touch-min);
  padding: 0 var(--space-3);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface-raised);
  color: var(--sr-pen);
  font: inherit;
  min-width: 0;
}

.remove {
  align-self: flex-start;
  color: var(--color-danger);
}

.add {
  align-self: flex-start;
  min-height: var(--touch-min);
  padding: 0 14px;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}
</style>
