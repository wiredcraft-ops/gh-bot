const pr = require('./bots/pr')
const commands = require('./bots/commands')
const appcommand = require('probot-commands')
const release = require('./bots/release')

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Application} app
 */
module.exports = app => {
  app.log('Yay, the app was loaded!')

  // Commands
  appcommand(app, 'kind', commands.kind)

  // Calculate the PR size
  app.on([
    'pull_request.opened',
    'pull_request.reopened',
    'pull_request.synchronized',
    'pull_request.edited'], pr.addSizeLable)

  // releaseNote create release note based on PR and create label to those PRs
  app.on('release.published', release.releaseNote)
  app.on('push', release.createRelease)

  // ignore marketplace event
  app.on('marketplace_purchase', async context => {
    return
  })



}
