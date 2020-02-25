const fs = require('fs')
const { formatDuration } = require('./utils')


async function contributorPullsStatistic(request, owner, repo, {
  channel,
  workload,
  stopTime,
  ifContributor,
  filter
}) {
  const per_page = request.per_page
  let finish = false
  let page = 0
  const users = []
  while (!finish) {
    page++
    console.log(`fetch page ${page}`)
    const pulls = await request.retry(request.getPrList, owner, repo, page, 'closed', 'updated')
    for (item of pulls) {
      const lastUpdated = new Date(item.updated_at).getTime()
      const association = item.author_association
      const login = item.user.login
      const merged = item.merged_at && item.merged_at != ""
      if (lastUpdated < stopTime) {
        finish = true
      }
      if (!item.closed_at || new Date(item.closed_at).getTime() < stopTime) {
        continue
      }
      const labels = filterLabel(item.labels.map(i => i.name))
      const user = users.find(i => i.login === login)
      if (!user) {
        users.push({
          login,
          association,
          merged: merged ? 1 : 0,
          labels
        })
      } else {
        if (merged) {
          user.merged++
          user.labels = combineLabel(labels, user.labels)
        }
      }
    }
  }

  let contributorUsers = users.sort((a, b) => b.merged - a.merged)
  if (ifContributor === true) {
    contributorUsers = contributorUsers.filter(i => i.association === 'CONTRIBUTOR')
  }
  if (filter) {
    contributorUsers = filter.do(contributorUsers, item => item.login)
  }
  users.sort((a, b) => b.merged - a.merged)
  const file = `/tmp/pulls-${owner}-${repo}-contributor-${formatDuration(stopTime, new Date())}.csv`
  // flush file content
  fs.writeFileSync(file, 'GitHub, merged pulls, check it out, components\n')
  const res = []
  for (const user of contributorUsers) {
    const url = `https://github.com/${owner}/${repo}/pulls?q=is%3Amerged+is%3Apr+author%3A${user.login}`
    const line = `${user.login}, ${user.merged}, ${url}, ${user.labels.join(' | ')}\n`
    fs.writeFileSync(file, line, {flag: 'a'})
    res.push({
      repo: `${owner}/${repo}`,
      login: user.login,
      merged: user.merged
    })
  }

  // request.retry(request.postSlackFile, channel, file, file)
  return res
}

function filterLabel(labels) {
  return labels.filter(i => i.indexOf('component') >= 0)
}

function combineLabel(a, b) {
  const res = []
  for (const label of a) {
    if (!res.find(i => i === label)) res.push(label)
  }
  for (const label of b) {
    if (!res.find(i => i === label)) res.push(label)
  }
  return res
}

module.exports = contributorPullsStatistic
