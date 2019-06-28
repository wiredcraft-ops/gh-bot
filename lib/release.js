const lableutil = require('../util/labels')

function isUnReleasedPR(pr, lastReleaseDate, releaseDate) {
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

    const mergedAt = Date.parse(pr.merged_at)

    if (lastReleaseDate) {
        return (mergedAt > Date.parse(lastReleaseDate)) && (mergedAt < Date.parse(releaseDate))
    }

    return mergedAt < Date.parse(releaseDate)
}

function isLargePR(pr) {
    const sizeLabel = pr.labels
        .map(label => label['name'])
        .filter(label => label.startsWith('size/'))

    if (sizeLabel.length != 1) {
        return false
    }

    const largeLabels = ['size/L', 'size/XL', 'size/XXL']
    if (largeLabels.includes(sizeLabel[0])) {
        return true
    }

    return false
}

function releaseItem(pr) {
    return `- ${pr.body} ${pr.html_url} @${pr.user.login}\r\n`
}

async function getLastReleaseDate(context) {
    const tagsResp = await context.github.repos.listTags(context.repo())
    const tags = tagsResp.data
    if (tags.length < 2) {
        return null
    }
    const lastTag = tags[1]
    try {
        const lastRelease = await context.github.repos.getReleaseByTag(context.repo({ tag: lastTag.name }))
        return lastRelease.data.published_at
    } catch (e) { }

    try {
        const commit = await context.github.gitdata.getCommit(context.repo({ commit_sha: lastTag.commit.sha }))
        return commit.data.author.date
    } catch (e) {
        return null
    }
}


// Event: release.published
// add release tag to PRs
async function tagPR(context) {
    const { release: { tag_name: release, id: releaseId, published_at: releaseDate } } = context.payload
    const lastReleaseDate = await getLastReleaseDate(context)
    const releaseTag = `released/${release}`
    const color = '2196F3'
    // if tag is not exist then we will create it.
    await lableutil.ensureLabelExists(context, releaseTag, color)

    // add release tag to those prs:
    // state == close and no release tag on it
    const allprs = await context.github.pullRequests.list(context.repo({ state: 'closed' }))
    const prs = allprs.data.filter(pr => isUnReleasedPR(pr, lastReleaseDate, releaseDate))

    const largePRs = prs.filter(pr => isLargePR(pr))
    let largeUpdates = `- None`
    if (largePRs.length != 0) {
        largeUpdates = largePRs.map(pr => releaseItem(pr))
    }


    const smallPRs = prs.filter(pr => !isLargePR(pr))
    let smallUpdates = `- None`
    if (smallPRs.length != 0) {
        smallUpdates = smallPRs.map(pr => releaseItem(pr))
    }

    const bodys = `## Large updaets: \r\n ${largeUpdates} \r\n----------\r\n\r\n ${smallUpdates}`
    const releaseNote = `# Release Note:\r\n ${bodys}`

    await context.github.repos.updateRelease(context.repo({ release_id: releaseId, body: releaseNote }))

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
