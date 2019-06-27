const lableutil = require('../util/labels')

function isUnReleasedPR(pr) {
    // labels like `released/v0.0.1`
    const releaseLabel = pr.labels
        .map(label => label['name'])
        .filter(label => label.startsWith('released'))

    if (releaseLabel.length > 0) {
        return false
    }

    // we don't care this pr if it's not be merged
    if (!('merged_at' in pr)) {
        return false
    }
    if (pr.merged_at == null) {
        return false
    }
    return true
}


// Event: release.published
// add release tag to PRs
async function tagPR(context) {
    const { release: { tag_name: release } } = context.payload
    const releaseTag = `released/${release}`
    const color = '2196F3'
    // if tag is not exist then we will create it.
    await lableutil.ensureLabelExists(context, releaseTag, color)

    // add release tag to those prs:
    // state == close and no release tag on it
    const allprs = await context.github.pullRequests.list(context.repo({ state: 'closed' }))
    const prs = allprs.data.filter(pr => isUnReleasedPR(pr))

    prs.forEach(async (pr) => {
        const { number } = pr
        await context.github.issues.addLabels(context.repo({
            number: number,
            labels: [releaseTag]
        }))
    })
}



// Event: push
// create new release if any new tag has been pushed
async function create(context) {
    const ref = context.payload.ref
    if (!ref.startsWith('refs/tags/')) {
        return
    }
    if (!context.payload.created) {
        return
    }
    const tag = ref.split('/')[2]
    await context.github.repos.createRelease(context.repo({ tag_name: tag, name: tag }))
}

module.exports = {
    create: create,
    tagPR: tagPR,
}
