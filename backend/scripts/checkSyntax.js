// Zero-dependency "build" step. Lambda runs Node source directly (no
// bundling step is required for this project), so "build" here means
// syntax-validating every source file rather than producing a bundle.
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(dirname, '..', 'src')

function collectJsFiles(dir) {
  const entries = readdirSync(dir)
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectJsFiles(fullPath))
    } else if (entry.endsWith('.js')) {
      files.push(fullPath)
    }
  }
  return files
}

const files = collectJsFiles(srcDir)
let failed = false

for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
  } catch (err) {
    failed = true
    console.error(`Syntax error in ${file}:`)
    console.error(err.stderr?.toString() ?? err.message)
  }
}

if (failed) {
  process.exitCode = 1
} else {
  console.log(`Syntax OK: ${files.length} backend source files.`)
}
