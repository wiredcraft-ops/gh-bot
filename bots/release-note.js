const lableutil = require('../util/labels')

function filterReleasePR(pr) {
    let releaseLabel = pr.labels.map(x => x['name']).filter(x => x.startsWith('released'))
    if (releaseLabel.length > 0) {
        return false
    }

    if (pr.merged_at == null) {
        return false
    }
    return true
}

async function releaseNote(context) {
    const { release: { tag_name: release }, repository: { owner: { login: owner }, name: repo } } = context.payload
    const allprs = await context.github.pullRequests.list({ owner, repo, state: 'closed' })
    const releaseTag = `released/${release}`
    await lableutil.ensureLabelExists(context, releaseTag, '2196F3')

    const prs = allprs.data.filter(pr => filterReleasePR(pr))
    //const releaseNote = prs
    prs.forEach(async (pr) => {
        const { number } = pr
        await context.github.issues.addLabels(context.repo({
            number: number,
            labels: [releaseTag]
        }))
    })
}



module.exports = releaseNote
