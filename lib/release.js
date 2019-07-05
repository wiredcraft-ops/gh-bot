const lableutil = require('../util/labels')
const slack = require('../util/slack')
const mustache = require('mustache')

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
    return `${pr.body} ${pr.html_url} @${pr.user.login}`
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
async function tagPR(context, prs, tag) {
    const color = '2196F3'
    // if tag is not exist then we will create it.
    await lableutil.ensureLabelExists(context, tag, color)
    prs.forEach(async (pr) => {
        const { number } = pr
        await context.github.issues.addLabels(context.repo({
            number: number,
            labels: [tag]
        }))
    })
}

async function releaseNoteBody(prs) {
    const largePRs = []
    const smallPRs = []
    for (const pr of prs) {
        if (isLargePR(pr)) {
            largePRs.push(pr)
        } else {
            smallPRs.push(pr)
        }
    }
    const updates = {
        important: [],
        small: []
    }

    largePRs.forEach(pr => {
        updates.important.push(releaseItem(pr))
    })
    smallPRs.forEach(pr => {
        updates.small.push(releaseItem(pr))
    })

    const tmpl = `
{{#important}}
Important Updates:
    - {{{.}}}
{{/important}}

{{#small}}
Small Updates:
    - {{{.}}}
{{/small}}
    `
    return mustache.render(tmpl, updates)
}

async function published(context) {
    const { release: { tag_name: release, id: releaseId, published_at: releaseDate } } = context.payload
    const lastReleaseDate = await getLastReleaseDate(context)

    // add release tag to those prs:
    // state == close and no release tag on it
    const allprs = await context.github.pullRequests.list(context.repo({ state: 'closed' }))
    const prs = allprs.data.filter(pr => isUnReleasedPR(pr, lastReleaseDate, releaseDate))
    const updates = await releaseNoteBody(prs)
    await context.github.repos.updateRelease(context.repo({ release_id: releaseId, body: updates }))

    const notification = `*${context.repo().owner}/${context.repo().repo} ${release} is available* :tada: ${updates}`
    slack.sendMessage(notification, ['kaleo'])

    await tagPR(context, prs, `released/${release}`)
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
    published: published,
}
