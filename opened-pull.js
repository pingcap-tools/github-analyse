const { formatTime } = require('./utils')
const per_page = require('./request').per_page
const { MEMBER_ASSOCIATION } = require('./constant')

module.exports = async function(request, owner, repo, {
  channel,
  workload,
  stopTime
}) {
  let finish = false
  let page = 0
  const pullRequests = []
  while (!finish) {
    page++
    console.log(`fetch page ${page}`)
    const pulls = await request.retry(request.getPrList, owner, repo, page, 'open', 'created', 'asc')
    if (pulls.length < request.per_page) finish = true
    for (item of pulls) {
      let ignore = false
      const created = new Date(item.created_at).getTime()
      for (const label of item.labels) {
        if (label.name === 'S: DNM' || label.name === 'S: WIP') {
          ignore = true
        }
      }
      if (MEMBER_ASSOCIATION.indexOf(item.author_association) < 0) {
        continue
      }
      if (ignore) {
        continue
      }
      if (created > stopTime) {
        finish = true
      } else {
        pullRequests.push(item)
      }
    }
  }

  const title = `${workload} ${owner}/${repo}`
  let report = pullRequests.map(pull => {
    const url = `https://github.com/${owner}/${repo}/pull/${pull.number}`
    const duration = new Date() - new Date(pull.created_at)
    return `${url} ${pull.user.login} ${formatTime(duration)}`
  }).join('\n')

  // console.log(report)
  request.retry(request.postSlackReport, channel, title, report)
}
