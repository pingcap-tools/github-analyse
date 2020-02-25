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
  const issuesArr = []
  while (!finish) {
    page++
    console.log(`fetch page ${page}`)
    const issues = await request.retry(request.getIssueList, owner, repo, page, 'all')
    if (issues.length === 0) finish = true
    for (item of issues) {
      const created = new Date(item.created_at).getTime()
      if (created < stopTime) {
        finish = true
      } else if (!item.pull_request) {
        issuesArr.push(item)
      }
    }
  }

  // pullRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const closedIssues = []
  const openedIssues = []
  for (issue of issuesArr) {
    if (issue.closed_at) {
      closedIssues.push(issue)
    } else {
      openedIssues.push(issue)
    }
  }

  const meanClosedTime = closedIssues
    .map(i => calcDuration(i.created_at, i.closed_at))
    .reduce((a, b) => a + b, 0) / (closedIssues.length || 1)
  const closed90 = closedIssues.sort((a, b) => {
    const d1 = calcDuration(a.created_at, a.closed_at)
    const d2 = calcDuration(b.created_at, b.closed_at)
    return d1 - d2
  })[Math.floor(closedIssues.length * 0.9)]
  const closedTime90 = closed90 ? calcDuration(closed90.created_at, closed90.closed_at) : undefined

  const meanOpenedTime = openedIssues
    .map(i => calcDuration(i.created_at, new Date().getTime()))
    .reduce((a, b) => a + b, 0) / (openedIssues.length || 1)
  const opened90 = openedIssues.sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime()
  })[Math.floor(openedIssues.length * 0.9)]
  const openedTime90 = opened90 ? calcDuration(opened90.created_at, new Date().getTime()) : undefined
  
  const longLivePull = openedIssues.sort((a, b) => {
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })[0]

  const noUpdate = []
  openedIssues.sort((a, b) => {
    return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
  })
  for (let i = 0; i < 5; i++) {
    if (!openedIssues[i]) break
    noUpdate.push({
      number: openedIssues[i].number,
      duration: formatTime(new Date().getTime() - new Date(openedIssues[i].updated_at).getTime())
    })
  }

  const unassigned = issuesArr.filter(i => !i.assignee).length
  
  const title = `${workload} ${owner}/${repo}`
  let report = `Opened ${issuesArr.length} issues, ${unassigned} unassigned\n` +
  `${closedIssues.length} closed, average using ${formatTime(meanClosedTime)}` + (closedTime90 ? `, closed time 90% ${formatTime(closedTime90)}\n` : '\n') +
    `${openedIssues.length} opened, average opened ${formatTime(meanOpenedTime)}` + (openedTime90 ? `, opened time 90% ${formatTime(openedTime90)}` : '\n')
  if (longLivePull) {
    const longestDuration = formatTime(new Date().getTime() - new Date(longLivePull.created_at).getTime())
    report += `\nThe PR lives longest is #${longLivePull.number}, opened ${longestDuration} `
    report += `https://github.com/${owner}/${repo}/issues/${longLivePull.number}`
  }
  if (noUpdate.length) {
    report += '\nNo-Update Leaderboard'
    report += `\n${noUpdate.map(i => {
      return `#${i.number} ${i.duration} https://github.com/${owner}/${repo}/issues/${i.number}`
    }).join('\n')}`
  }

  // check channel prefix and send report
  if (!channel.startsWith('#')) channel = '#' + channel
  request.retry(request.postSlackReport, channel, title, report)
}

module.exports = getReport
