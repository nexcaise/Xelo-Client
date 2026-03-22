const fs = require('fs')
const path = require('path')

const SOURCE_DIR = './backup/app/src/main/java'
const TARGET_DIR = './app/src/main/java'
const ROOT_DIR = './app/src/main/java'
const BASE_PACKAGE = 'com.origin.launcher'

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

function extractClassNames(content) {
    const classes = []
    const regex = /\b(class|interface|enum|object)\s+([A-Za-z0-9_]+)/g
    let m

    while ((m = regex.exec(content)) !== null) {
        classes.push(m[2])
    }

    return classes
}

const IGNORE_CLASSES = new Set([
    'String','Integer','Boolean','Long','Short','Double','Float',
    'Object','Class','Void'
])

function buildClassMap(files) {
    const map = {}

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8')
        const classes = extractClassNames(content)
        if (!classes.length) return

        const pkg = pathToPackage(file)

        classes.forEach(cls => {
            if (IGNORE_CLASSES.has(cls)) return
            map[cls] = pkg
        })
    })

    return map
}

function fixPackage(content, pkg) {
    if (content.match(/package\s+/)) {
        return content.replace(/package\s+[a-zA-Z0-9_.]+/, `package ${pkg}`)
    }
    return `package ${pkg}\n\n` + content
}

function getExistingImports(content) {
    const imports = new Set()
    const regex = /import\s+[a-zA-Z0-9_.]+\.([A-Za-z0-9_]+)/g
    let m
    while ((m = regex.exec(content)) !== null) {
        imports.add(m[1])
    }
    return imports
}

function detectUsedClasses(content) {
    const used = new Set()
    const regex = /\b([A-Z][A-Za-z0-9_]+)\b/g
    let m
    while ((m = regex.exec(content)) !== null) {
        used.add(m[1])
    }
    return used
}

function needsRImport(content) {
    return /\bR\./.test(content)
}

function insertImports(content, importBlock) {
    return content.replace(
        /package\s+[a-zA-Z0-9_.]+;?\s*/,
        (match) => {
            return match.trimEnd() + '\n\n' + importBlock + '\n'
        }
    )
}

function fixWrongImports(content, classMap, currentPkg, isJava) {
    return content.replace(
        /import\s+([a-zA-Z0-9_.]+)\.([A-Za-z0-9_]+);?/g,
        (match, oldPkg, cls) => {

            if (isExternal(oldPkg)) return match

            const correctPkg = classMap[cls]
            if (!correctPkg) return match

            if (correctPkg === currentPkg) return ''

            const full = `${correctPkg}.${cls}`

            return isJava
                ? `import ${full};`
                : `import ${full}`
        }
    )
}

function generateImports(content, classMap, currentPkg, isJava) {
    const existing = getExistingImports(content)
    const used = detectUsedClasses(content)

    const newImports = []

    used.forEach(cls => {
        const targetPkg = classMap[cls]

        if (!targetPkg) return
        if (existing.has(cls)) return
        if (targetPkg === currentPkg) return
        if (isExternal(targetPkg)) return

        const fullImport = `${targetPkg}.${cls}`

        newImports.push(
            isJava ? `import ${fullImport};` : `import ${fullImport}`
        )
    })

    if (needsRImport(content) && !existing.has('R')) {
        const rImport = `${BASE_PACKAGE}.R`
        newImports.push(
            isJava ? `import ${rImport};` : `import ${rImport}`
        )
    }

    if (newImports.length === 0) return content

    return insertImports(content, newImports.join('\n'))
}

function processFile(file, classMap) {
    let content = fs.readFileSync(file, 'utf8')

    const currentPkg = pathToPackage(file)
    const isJava = file.endsWith('.java')

    content = fixPackage(content, currentPkg)
    content = fixWrongImports(content, classMap, currentPkg, isJava)
    content = generateImports(content, classMap, currentPkg, isJava)

    fs.writeFileSync(file, content)
    console.log('Fixed:', file)
}

async function main() {
    await copyRecursive(SOURCE_DIR, TARGET_DIR)

    const files = walk(ROOT_DIR)
    const classMap = buildClassMap(files)

    files.forEach(file => processFile(file, classMap))

    console.log('DONE FULL AUTO FIX')
}

main()