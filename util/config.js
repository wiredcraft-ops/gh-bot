const yaml = require('js-yaml')
const fs = require('fs')

const defaultConfigPath = 'tm.yaml'
const defaultConfig = {}
function readConfig() {
    const path = defaultConfigPath

    if (!fs.existsSync(path)) {
        console.log(`${path} is not exist, return default config`)
        return defaultConfig
    }

    try {
        const config = yaml.safeLoad(fs.readFileSync(path, 'utf8'))
        return config
    }
    catch (e) {
        console.error(e)
        return defaultConfig
    }

}

module.exports = {
    readConfig: readConfig
}
