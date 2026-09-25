const { spawnSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')
const command = process.argv.slice(2)
const root = path.resolve(__dirname, '..')
const database = process.env.DATABASE_URL || 'file:./dev.db'
// Prisma 6 on Windows may fail to deploy into a nonexistent SQLite file.
// Open with 'wx' so an existing database can never be truncated.
if ((command[0] === 'migrate' || command[0] === 'db') && database.startsWith('file:')) {
 const target = path.resolve(root, 'prisma', database.slice(5))
 fs.mkdirSync(path.dirname(target), { recursive: true })
 try { fs.closeSync(fs.openSync(target, 'wx')) } catch (error) { if (error.code !== 'EEXIST') throw error }
}
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...command], {
 cwd: root, env: { ...process.env, DATABASE_URL: database }, stdio: 'inherit'
})
process.exit(result.status ?? 1)
