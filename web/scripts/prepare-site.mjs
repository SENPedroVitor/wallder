import { cp, mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const target = path.resolve(process.argv[2] || path.join(project, '.artifacts', 'hosting-template'))
await mkdir(target, { recursive: true })
for (const name of ['src', 'public', 'index.html', 'tsconfig.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) await cp(path.join(project, name), path.join(target, name), { recursive: true })
await cp(path.join(project, 'cloud'), path.join(target, 'cloud'), { recursive: true })
const pkg = JSON.parse(await readFile(path.join(project, 'package.json'), 'utf8'))
pkg.scripts = { dev: 'vite --host 127.0.0.1', build: 'tsc -b && vite build && node cloud/build.mjs', 'db:generate': 'drizzle-kit generate' }
pkg.dependencies['drizzle-orm'] = '^0.44.0'
pkg.devDependencies['drizzle-kit'] = '^0.31.0'
await writeFile(path.join(target, 'package.json'), JSON.stringify(pkg, null, 2))
await writeFile(path.join(target, 'vite.config.mjs'), "import { defineConfig } from 'vite'; import react from '@vitejs/plugin-react'; export default defineConfig({plugins:[react()],build:{outDir:'dist/client'}});\n")
await writeFile(path.join(target, 'drizzle.config.ts'), "import { defineConfig } from 'drizzle-kit'; export default defineConfig({out:'./drizzle',schema:'./cloud/schema.ts',dialect:'sqlite'});\n")
await writeFile(path.join(target, '.gitignore'), 'node_modules/\ndist/\n.sites-runtime/\n*.tsbuildinfo\n.env*\n')
await mkdir(path.join(target, '.openai'), { recursive: true })
await writeFile(path.join(target, '.openai', 'hosting.json'), JSON.stringify({ d1: 'DB', r2: 'BUCKET' }, null, 2))
console.log(target)
