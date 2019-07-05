const axios = require('axios')
const config = require('./config')
const minimatch = require("minimatch")


function sendMessage(body, targets) {
    const hooks = getSlackHooks(targets)
    if (hooks.length == 0) {
        console.log(`didnt find any slack hooks for ${targets}`)
        return
    }

    hooks.forEach(hook => {
        axios.post(hook, {
            text: body
        }).then((res) => {
            console.log(`statusCode: ${res.status}`)
        }).catch((error) => {
            console.error(error)
        })
    })

}


function getSlackHooks(targets) {
    const hooks = []

    const c = config.readConfig()
    if (!('slack' in c) || !('hooks' in c.slack)) {
        return hooks
    }

    const targetKeys = Object.keys(c.slack.hooks)
    if (targetKeys.length == 0) {
        return hooks
    }

    for (const target of targets) {
        for (const targetKey of targetKeys) {
            if (minimatch(target, targetKey)) {
                hooks.push(c.slack.hooks[targetKey])
            }
        }
    }
    if (hooks.length == 0) {
        console.log(`no slack hook for ${target}`)
    }
    return [...new Set(hooks)];
}


module.exports = {
    sendMessage: sendMessage
}
