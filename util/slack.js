const axios = require('axios')
const config = require('./config')


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

    for (const target of targets) {
        if (target in c.slack.hooks) {
            hooks.push(c.slack.hooks[target])
        } else {
            console.log(`no slack hook for ${target}`)
        }
    }
    return hooks
}


module.exports = {
    sendMessage: sendMessage
}
