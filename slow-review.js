const { per_page } = require('./request')
const { formatTime } = require('./utils')

async function slowReview(request, owner, repo, {label}) {
  console.log('Find slow reivew', owner, repo)
  const now = Date.now()

  let pulls = await getOpenedPulls(request, owner, repo)
  const results = []

  if (label) {
    const labelRegex = new RegExp(label.replace(/\*/g, '.*'), 'i')
    pulls = pulls.filter(pull => {
      for (label of pull.labels.map(label => label.name)) {
        if (labelRegex.test(label)) {
          return true
        }
      }
      return false
    })
  }

  console.log(`Start processing ${pulls.length} pulls`)

  for (const pull of pulls) {
    let reviews = [], page = 0, reviewers = {}
    do {
      page += 1
      reviews = await request.retry(request.getPullReviews, owner, repo, pull.number, page)
      for (const review of reviews) {
        reviewers[review.user.login] = 1
      }
    } while (reviews.length === per_page)
    const pullItem = {
      owner,
      repo,
      number: pull.number,
      lastReviewer: '',
      reviewers: []
    }
    if (reviews.length == 0) {
      pullItem.lastUpdate = new Date(pull.created_at)
    } else {
      const lastReview = reviews[reviews.length - 1]
      pullItem.lastUpdate = new Date(lastReview.submitted_at)
      pullItem.lastReviewer = lastReview.user.login
      for (const reviewer in reviewers) {
        pullItem.reviewers.push(reviewer)
      }
    }
    results.push(pullItem)
  }

  results.sort((a, b) => a.lastUpdate.getTime() - b.lastUpdate.getTime())

  for (const pull of results) {
    const pullURL = `https://github.com/${pull.owner}/${pull.repo}/pull/${pull.number}`,
          duration = formatTime(now - pull.lastUpdate.getTime()),
          lastReviewer = pull.lastReviewer || 'no one'
          reviewers = pull.reviewers.join(' | ') || 'no one'
    console.log(`${pullURL}, ${duration}, ${lastReviewer}, ${reviewers}`)
  }
}

async function getOpenedPulls(request, owner, repo) {
  let pulls = []
  let page = 0
  let pagePulls = []
  do {
    page += 1
    pagePulls = await request.retry(request.getPrList, owner, repo, page, 'open')
    pulls = pulls.concat(pagePulls)
  } while (pagePulls.length > 0)
  return pulls
}

module.exports = slowReview
