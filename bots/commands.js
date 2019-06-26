const commands = require('probot-commands')
const labelutil = require('../util/labels')

module.exports = {
    async kind(context, command) {
        const label = {
            bug: 'kind/bug',
            feature: 'kind/feature'
        }

        const colors = {
            'kind/bug': 'FFFF00',
            'kind/feature': 'FFEA00'
        }


        const labels = command.arguments.split(/, */)
        const labelNames = labels.filter(x => x in label).map(x => label[x])

        return labelutil.addLabels(context, labelNames, colors)
    }
}

