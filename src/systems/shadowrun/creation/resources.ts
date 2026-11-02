import type { Violation } from '@/core/rules/system'
import type { Augmentation, Capacity } from '../rules/catalogs'
import { augPart, availabilityOf, price, type ResourcesData } from '../rules/resources'
import { nameOf, type UiCatalogs } from './catalogs'

const nuyen = new Intl.NumberFormat('pt-BR')
export const yen = (n: number) => `${nuyen.format(n)} ¥`

const thousandths = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 })
export const decimal = (n: number) => thousandths.format(n)

export type ListName = Exclude<keyof ResourcesData, 'karmaToNuyen' | 'startingNuyenRoll'>

export const augCategories: Record<string, string> = {
  headware: 'Cabeça',
  eyeware: 'Olhos',
  earware: 'Ouvidos',
  bodyware: 'Corpo',
  cyberlimb: 'Cibermembro',
  'cyberlimb-enhancement': 'Melhoria de cibermembro',
  'cyberlimb-accessory': 'Acessório de cibermembro',
  'cyber-implant-weapon': 'Arma implantada',
  bioware: 'Biônico',
  'cultured-bioware': 'Biônico cultivado',
}

const identityNames: Record<string, string> = {
  'fake-sin': 'SIN falso',
  'fake-license': 'Licença falsa',
}

// Nome de qualquer item de equipamento pelo id do catálogo.
export function gearName(c: UiCatalogs, id: string): string {
  if (identityNames[id]) return identityNames[id]
  for (const list of [
    c.lifestyles,
    c.weapons,
    c.armor,
    c.armorModifications,
    c.augmentations,
    c.commlinks,
    c.cyberdecks,
    c.programs,
    c.vehicles,
    c.commlinkOptions,
  ] as { id: string; name: string }[][]) {
    const x = list.find((i) => i.id === id)
    if (x) return x.name
  }
  return id
}

export const capacityOf = (a: Pick<Augmentation, 'capacity'>): Capacity =>
  typeof a.capacity === 'object' && a.capacity ? a.capacity : {}

// Ampliações da ficha que podem receber esta, pela categoria.
export function hostsFor(c: UiCatalogs, data: ResourcesData, a: Augmentation, key: string) {
  return (data.augmentations ?? [])
    .filter((h) => h.key !== key)
    .map((h) => ({ h, cat: c.augmentations.find((x) => x.id === h.id) }))
    .filter(
      ({ h, cat }) =>
        cat &&
        capacityOf(cat).accepts?.includes(a.category) &&
        capacityOf(augPart(cat, h)).provides,
    )
    .map(({ h, cat }) => ({ key: h.key, name: cat!.name }))
}

const maxAvailability = (c: UiCatalogs) => c.mechanics.creation.resources.maxAvailability

// Motivo para o item ficar bloqueado no seletor, no nível mínimo.
export function availabilityBlock(c: UiCatalogs, value: number): string | undefined {
  const max = maxAvailability(c)
  if (value > max) return `Disponibilidade ${value}, acima de ${max}`
}

export interface GearPick {
  id: string
  name: string
  note: string
  price: string
  blocked?: string
  description?: string
}

const fromPrice = (cost: unknown, rated: boolean, min = 1) =>
  `${rated ? 'a partir de ' : ''}${yen(price(cost, min))}`

export function pickerItems(c: UiCatalogs, list: ListName): GearPick[] {
  switch (list) {
    case 'lifestyles':
      return c.lifestyles.map((l) => ({
        id: l.id,
        name: l.name,
        note: l.startingNuyen
          ? `Nuyen inicial ${l.startingNuyen.dice}D6 × ${l.startingNuyen.multiplier}`
          : 'Sem nuyen inicial',
        price: `${yen(l.cost ?? 0)}/mês`,
        blocked: l.primary === false ? 'Só durante uma internação' : undefined,
        description: l.desc,
      }))
    case 'weapons':
      return c.weapons.map((w) => ({
        id: w.id,
        name: w.name,
        note: nameOf(c.weaponCategories, w.category),
        price: fromPrice(w.cost, !!w.rating, w.rating?.min),
        blocked: availabilityBlock(c, availabilityOf(w.availability, w.rating?.min ?? 1)),
        description: w.desc,
      }))
    case 'armor':
      return c.armor.map((a) => ({
        id: a.id,
        name: a.name,
        note: typeof a.armor === 'number' ? `Armadura ${a.armor}` : 'Soma à armadura vestida',
        price: yen(price(a.cost, 1)),
        blocked: availabilityBlock(c, availabilityOf(a.availability, 1)),
        description: a.desc,
      }))
    case 'augmentations':
      return c.augmentations.map((a) => {
        const min = a.rating?.min ?? 1
        const part = augPart(a, { key: '', id: a.id, rating: min, variant: a.variants?.[0]?.id })
        return {
          id: a.id,
          name: a.name,
          note: `${augCategories[a.category] ?? a.category} · ${a.type === 'bioware' ? 'biônico' : 'cibernético'}`,
          price: fromPrice(part.cost, !!a.rating || !!a.variants, min),
          blocked: availabilityBlock(c, availabilityOf(part.availability, min)),
          description: a.desc,
        }
      })
    case 'devices':
      return [
        ...c.commlinks.map((d) => ({ d, kind: 'Com-link' })),
        ...c.cyberdecks.map((d) => ({ d, kind: 'Ciberdeck' })),
      ].map(({ d, kind }) => ({
        id: `${kind === 'Com-link' ? 'commlink' : 'cyberdeck'}:${d.id}`,
        name: d.name,
        note: `${kind} · Nível ${d.deviceRating}`,
        price: yen(price(d.cost, 1)),
        blocked:
          d.deviceRating > c.mechanics.creation.resources.maxDeviceRating
            ? `Nível de dispositivo acima de ${c.mechanics.creation.resources.maxDeviceRating}`
            : availabilityBlock(c, availabilityOf(d.availability, 1)),
        description: d.desc,
      }))
    case 'vehicles':
      return c.vehicles.map((v) => ({
        id: v.id,
        name: v.name,
        note: nameOf(c.vehicleCategories, v.category),
        price: yen(price(v.cost, 1)),
        blocked: availabilityBlock(c, availabilityOf(v.availability, 1)),
        description: v.desc,
      }))
  }
  return []
}

// Mensagem de uma violação de recursos, com nomes do catálogo.
export function resourceMessage(c: UiCatalogs, v: Violation): string {
  const p = v.params ?? {}
  const item = gearName(c, String(p.item ?? ''))
  switch (v.code) {
    case 'required':
      return p.field === 'resources.lifestyles'
        ? 'Escolha um estilo de vida principal.'
        : 'Falta informar a rolagem do nuyen inicial.'
    case 'budget.exceeded':
      return p.budget === 'karmaToNuyen'
        ? `Só dá para converter até ${p.total} de carma.`
        : `Os gastos passam do nuyen em ${yen(Number(p.spent) - Number(p.total))}.`
    case 'gear.availabilityMax':
      return `${item}: Disponibilidade ${p.availability} passa do limite de ${p.max} na criação.`
    case 'gear.ratingOutOfRange':
      return `${item}: o nível vai de ${p.min} a ${p.max}.`
    case 'gear.costOutOfRange':
      return `${item}: o preço vai de ${yen(Number(p.min))} a ${yen(Number(p.max))}.`
    case 'gear.variantRequired':
      return `${item}: escolha o modelo.`
    case 'gear.parameterRequired':
      return `${item}: escolha a perícia.`
    case 'gear.parameterNotAllowed':
      return `${item}: essa perícia não existe.`
    case 'gear.gradeNotAllowed':
      return `${item}: ${nameOf(c.grades, String(p.grade))} não está à venda na criação.`
    case 'gear.notInstallable':
      return `${item} não cabe nesse implante.`
    case 'gear.hostRequired':
      return `${item} só funciona instalado em outro implante.`
    case 'gear.excluded':
      return `${item} não funciona junto com ${gearName(c, String(p.with))}.`
    case 'gear.duplicate':
      return `${item} já está na ficha.`
    case 'gear.capacityExceeded':
      return `${item}: ${p.used} de capacidade ocupada em ${p.capacity}.`
    case 'gear.deviceRatingMax':
      return `${item}: nível de dispositivo acima de ${p.max}.`
    case 'gear.deckArrayInvalid':
      return `${item}: distribua os valores do deck entre os quatro atributos.`
    case 'resources.primaryLifestyleDuplicate':
      return 'Só um estilo de vida pode ser o principal.'
    case 'resources.lifestyleNotAllowed':
      return `${gearName(c, String(p.lifestyle))} não pode ser comprado na criação.`
    case 'essence.depleted':
      return 'A Essência chegou a zero: o personagem não sobrevive aos implantes.'
  }
  return 'Há um problema neste item.'
}
