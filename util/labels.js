async function addLabel(context, name, color) {
    const params = Object.assign({}, context.issue(), { labels: [name] })

    await ensureLabelExists(context, name, color)
    await context.github.issues.addLabels(params)
}

async function addLabels(context, names, colors) {
    for (let name of names) {
        let color = colors[names] || 'F1F8E9'
        await addLabel(context, name, color)
    }
}

async function ensureLabelExists(context, name, color) {
    try {
        return await context.github.issues.getLabel(context.repo({
            name: name
        }))
    } catch (e) {
        return context.github.issues.createLabel(context.repo({
            name: name,
            color: color
        }))
    }
}

module.exports = {
    addLabel: addLabel,
    ensureLabelExists,
    addLabels: addLabels
}

