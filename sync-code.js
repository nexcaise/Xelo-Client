const fs = require('fs')
const path = require('path')

const SOURCE_DIR = './backup/app/src/main/java'
const TARGET_DIR = './app/src/main/java'
const ROOT_DIR = './app/src/main/java'

const SAFE_PREFIX = [
    'android.',
    'java.',
    'javax.',
    'kotlin.',
    'com.google.',
    'com.mojang.'
]

function isExternal(pkg) {
    return SAFE_PREFIX.some(p => pkg.startsWith(p))
}

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return

    const stat = fs.statSync(src)

    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true })
        }

        fs.readdirSync(src).forEach(file => {
            copyRecursive(
                path.join(src, file),
                path.join(dest, file)
            )
        })
    } else {
        fs.copyFileSync(src, dest)
    }
}

function walk(dir, files = []) {
    fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f)
        const stat = fs.statSync(full)

        if (stat.isDirectory()) {
            walk(full, files)
        } else if (f.endsWith('.java') || f.endsWith('.kt')) {
            files.push(full)
        }
    })
    return files
}

function pathToPackage(filePath) {
    const rel = path.relative(ROOT_DIR, path.dirname(filePath))
    return rel.split(path.sep).join('.')
}

function extractClassName(content) {
    const m = content.match(/class\s+([A-Za-z0-9_]+)/)
    return m ? m[1] : null
}

function buildClassMap(files) {
    const map = {}

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8')
        const cls = extractClassName(content)
        if (!cls) return

        const pkg = pathToPackage(file)
        map[cls] = pkg
    })

    return map
}

function fixPackage(content, pkg) {
    if (content.match(/package\s+/)) {
        return content.replace(/package\s+[a-zA-Z0-9_.]+/, `package ${pkg}`)
    }
    return `package ${pkg}\n\n` + content
}

function fixImports(content, classMap, isJava) {
    return content.replace(
        /import\s+([a-zA-Z0-9_.]+)\.([A-Za-z0-9_]+);?/g,
        (match, fullPkg, cls) => {

            if (isExternal(fullPkg)) return match

            if (!fullPkg.startsWith('com.origin.launcher')) return match

            if (classMap[cls]) {
                const newImport = `${classMap[cls]}.${cls}`
                return isJava
                    ? `import ${newImport};`
                    : `import ${newImport}`
            }

            return match
        }
    )
}

function processFile(file, classMap) {
    let content = fs.readFileSync(file, 'utf8')

    const pkg = pathToPackage(file)
    const isJava = file.endsWith('.java')

    content = fixPackage(content, pkg)
    content = fixImports(content, classMap, isJava)

    fs.writeFileSync(file, content)
    console.log('Fixed:', file)
}

async function main() {
    //await copyRecursive(SOURCE_DIR, TARGET_DIR)

    const files = walk(ROOT_DIR)
    const classMap = buildClassMap(files)

    files.forEach(file => processFile(file, classMap))

    console.log('DONE FIX IMPORT + PACKAGE')
}

main()