const per_page = require('./request').per_page
const { MEMBER_ASSOCIATION } = require('./constant')

const labelRegex = /^needs\-cherry\-pick\-([0-9.]+)$/
const releaseStart = `release-`

async function findUncherryPick(request, owner, repo, {
  channel
}) {
  const pulls = await getAllClosedPullrequests(request, owner, repo)
  const masterPulls = pulls.filter(i => i.base.ref === 'master' && i.merged_at !== null)

  let reports = []

  for (const masterPull of masterPulls) {
    console.log(masterPull.number)
    for (const needCherryPick of matchlabels(masterPull.labels)) {
      const release = releaseStart + needCherryPick
      const titlePattern = `#${masterPull.number}`
      const cherryPickPR = pulls.find(i => {
        if (!i.base.ref !== release) {
          return false
        }
        const fromPullMatch = /\(.*\)$/.exec(i.title.trim())
        let fromPulls = ''
        if (fromPullMatch) fromPulls = fromPullMatch[0]
        return fromPulls.split(',').map(c => c.trim()).includes(titlePattern)
      })
      if (cherryPickPR === undefined) {
        const authorOrApprover = await findReviewer(request, owner, repo, masterPull.number)
        reports.push(`${owner}/${repo}#${masterPull.number}, ${release}, ${masterPull.html_url}, ${authorOrApprover}`)
      }
    } 
  }

  const report = reports.join('\n')

  if (channel && channel !== '') {
    await request.retry(request.postSlackReport, channel, `Uncherry pick ${owner}/${repo}`, report)
  }
   else {
    console.log(report)
  }
}

async function getAllClosedPullrequests(request, owner, repo) {
  let page = 0, batch = [], all = []
  while (page === 0 || batch.length === per_page) {
    page++
    batch = await request.retry(request.getPrList, owner, repo, page, 'all')
    all = all.concat(batch)
    console.log(`all length ${all.length}`)
  }
  return all
}

async function findReviewer(r, owner, repo, pullNumber) {
  const pull = (await r.octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  })).data

  const isMember = await r.isMember(pull.user.login)
  if (isMember) {
    return pull.user.login
  }
  const reviews = await r.getPullReviews('pingcap', 'tidb', pullNumber, 1)
  for (const review of reviews) {
    if (review.author_association === 'MEMBER' || reviews.author_association === 'OWNER') {
      return review.user.login
    } 
  }
  return ''
}

function matchlabels(labels) {
  const r = []
  for (const l of labels) {
    const matches = labelRegex.exec(l.name)
    if (matches) {
      r.push(matches[1])
    }
  }
  return r
}

module.exports = findUncherryPick
