const pr = require('./lib/pr')
const commands = require('./lib/commands')
const release = require('./lib/release')
const appcommand = require('probot-commands')

module.exports = app => {
  app.log('Yay, the app was loaded!')

  // Github Commands
  appcommand(app, 'kind', commands.kind)

  // Calculate the PR size and add label to it
  app.on([
    'pull_request.opened',
    'pull_request.reopened',
    'pull_request.synchronized',
    'pull_request.edited'], pr.addSizeLable)

  // Create release note based on PR and create label to those PRs
  app.on('release.published', release.published)
  app.on('push', release.create)

  // ignore marketplace event
  app.on('marketplace_purchase', async context => {
    return
  })



}
