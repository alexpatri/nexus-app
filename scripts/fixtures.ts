// Baixa da tag fixada em package.json (nexus.systems) os catálogos e as
// fixtures do nexus-systems-api, para os testes rodarem os mesmos casos do core.
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const REPO = 'alexpatri/nexus-systems-api'
const root = join(import.meta.dirname, '..')
const target = join(root, 'test', 'fixtures')
const stamp = join(target, 'VERSION')

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const tag: string = pkg.nexus.systems

const current = await readFile(stamp, 'utf8').catch(() => '')
if (current.trim() === tag) process.exit(0)

const res = await fetch(`https://github.com/${REPO}/archive/refs/tags/${tag}.tar.gz`)
if (!res.ok) {
  console.error(`fixtures: não baixou ${REPO}@${tag} (${res.status})`)
  process.exit(1)
}

// O tarball abre em nexus-systems-api-<tag sem v>/; extrai num diretório
// temporário ao lado e só troca no fim, para não sobrar meia cópia.
await mkdir(join(root, 'test'), { recursive: true })
const tmp = await mkdtemp(join(root, 'test', '.fixtures-'))
const prefix = `nexus-systems-api-${tag.replace(/^v/, '')}`
const tar = spawn(
  'tar',
  [
    '-xz',
    '-C',
    tmp,
    '--strip-components=1',
    '--exclude=*.go',
    `${prefix}/data/systems`,
    `${prefix}/fixtures`,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
)
const exited = new Promise<number | null>((ok) => tar.on('close', ok))
tar.stdin.end(Buffer.from(await res.arrayBuffer()))
if ((await exited) !== 0) {
  await rm(tmp, { recursive: true, force: true })
  console.error('fixtures: tar falhou')
  process.exit(1)
}

await writeFile(join(tmp, 'VERSION'), `${tag}\n`)
await rm(target, { recursive: true, force: true })
await rename(tmp, target)
console.log(`fixtures: ${REPO}@${tag}`)
