const calcDuration = require('./utils').calcDuration
const formatTime = require('./utils').formatTime
const per_page = require('./request').per_page


async function getReport(request, owner, repo, {
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
    const pulls = await request.retry(request.getPrList, owner, repo, page, 'all', 'created')
    if (pulls.length === 0) finish = true
    for (item of pulls) {
      let ignore = false
      const created = new Date(item.created_at).getTime()
      for (const label of item.labels) {
        if (label.name === 'S: DNM' || label.name === 'S: WIP') {
          ignore = true
        }
      }
      if (ignore) {
        continue
      }
      if (created < stopTime) {
        finish = true
      } else {
        pullRequests.push(item)
      }
    }
  }
  // pullRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const mergedPulls = []
  const closedPulls = []
  const openedPulls = []
  for (pull of pullRequests) {
    if (pull.merged_at) {
      mergedPulls.push(pull)
    } else if (pull.closed_at) {
      closedPulls.push(pull)
    } else {
      openedPulls.push(pull)
    }
  }

  const meanMergeTime = mergedPulls
    .map(i => calcDuration(i.created_at, i.merged_at))
    .reduce((a, b) => a + b, 0) / (mergedPulls.length || 1)
  const merge90 = mergedPulls.sort((a, b) => {
    const d1 = calcDuration(a.created_at, a.merged_at)
    const d2 = calcDuration(b.created_at, b.merged_at)
    return d1 - d2
  })[Math.floor(mergedPulls.length * 0.9)]
  const mergeTime90 = calcDuration(merge90.created_at, merge90.merged_at)

  const meanClosedTime = closedPulls
    .map(i => calcDuration(i.created_at, i.closed_at))
    .reduce((a, b) => a + b, 0) / (closedPulls.length || 1)
  const closed90 = closedPulls.sort((a, b) => {
    const d1 = calcDuration(a.created_at, a.closed_at)
    const d2 = calcDuration(b.created_at, b.closed_at)
    return d1 - d2
  })[Math.floor(closedPulls.length * 0.9)]
  const closedTime90 = closed90 ? calcDuration(closed90.created_at, closed90.closed_at) : undefined

  const meanOpenedTime = openedPulls
    .map(i => calcDuration(i.created_at, new Date().getTime()))
    .reduce((a, b) => a + b, 0) / (openedPulls.length || 1)
  const opened90 = openedPulls.sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime()
  })[Math.floor(openedPulls.length * 0.9)]
  const openedTime90 = opened90 ? calcDuration(opened90.created_at, new Date().getTime()) : undefined
  
  const longLivePull = openedPulls.sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })[0]

  const noUpdate = []
  openedPulls.sort((a, b) => {
    return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
  })
  for (let i = 0; i < 5; i++) {
    if (!openedPulls[i]) break
    noUpdate.push({
      number: openedPulls[i].number,
      duration: formatTime(new Date().getTime() - new Date(openedPulls[i].updated_at).getTime())
    })
  }
  
  const title = `${workload} ${owner}/${repo}`
  let report = `Opened ${pullRequests.length} PRs\n` +
    `${mergedPulls.length} merged, average using ${formatTime(meanMergeTime)}, merge time 90% ${formatTime(mergeTime90)}\n` +
    `${closedPulls.length} closed, average using ${formatTime(meanClosedTime)}` + (closed90 ? `, closed time 90% ${formatTime(closedTime90)}\n` : '') +
    `${openedPulls.length} opened, average opened ${formatTime(meanOpenedTime)}` + (openedTime90 ? `, opened time 90% ${formatTime(openedTime90)}` : '')
  if (longLivePull) {
    const longestDuration = formatTime(new Date().getTime() - new Date(longLivePull.created_at).getTime())
    report += `\nThe PR lives longest is ${longLivePull.number}, opened ${longestDuration} `
    report += `https://github.com/${owner}/${repo}/pull/${longLivePull.number}`
  }
  if (noUpdate.length) {
    report += '\n\nNo-Update Leaderboard'
    report += `\n${noUpdate.map(i => {
      return `#${i.number} ${i.duration} https://github.com/${owner}/${repo}/pull/${i.number}`
    }).join('\n')}`
  }

  const slowMergeReport = mergedPulls.filter(i => {
    const duration = new Date(i.closed_at) - new Date(i.created_at)
    const week = 7 * 24 * 3600 *1000
    return duration > week
  }).map(pull => {
    const url = `https://github.com/${owner}/${repo}/pull/${pull.number}`
    const duration = new Date() - new Date(pull.created_at)
    return `${url} ${pull.user.login} ${formatTime(duration)}`
  }).join('\n')
  report += `\n\nslow merges\n${slowMergeReport}`

  request.retry(request.postSlackReport, channel, title, report)
}


module.exports = getReport
