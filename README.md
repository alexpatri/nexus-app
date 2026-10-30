# Nexus app

PWA mobile first para fichas de RPG de vários sistemas: Vue 3, TypeScript e
Ionic Vue, com Capacitor como caminho para as lojas. As decisões estão nas specs
do projeto (`app-mobile-e-criacao-de-ficha-shadowrun.md`,
`frontend-temas-por-sistema.md`, `frontend-design-nexus.md`).

## Rodar

Node 24 (`.node-version`).

```sh
npm install
npm run dev         # servidor de desenvolvimento
npm run test:unit   # Vitest
npm run lint
npm run build       # type-check + build com service worker
```

## Design

`src/design/` guarda o contrato `Theme`/`Brand`, os tokens base, o tema do
Nexus e a ponte para as variáveis do Ionic. `applyTheme` escreve o tema na raiz
do documento. Todo tema registrado em `themes.ts` passa pelo teste de contraste
(WCAG 2.2 AA).
