import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.join(__dirname, 'src')

function checkDir(dir) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules') checkDir(fullPath)
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      const code = fs.readFileSync(fullPath, 'utf8')
      // extremely basic check for unmatched brackets
      let openBraces = 0
      for (let i = 0; i < code.length; i++) {
        if (code[i] === '{') openBraces++
        if (code[i] === '}') openBraces--
      }
      if (openBraces !== 0) console.log(`Unmatched braces in ${file}: ${openBraces}`)
    }
  }
}

checkDir(srcDir)
console.log('Syntax check complete.')
