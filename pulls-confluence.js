const fs = require('fs')
const { formatDuration } = require('./utils')
const { per_page } = require('./request')
const { i18ntemplate } = require('./template')
const { MEMBER_ASSOCIATION } = require('./constant')


async function report(request, {
  channel,
  workload,
  stopTime,
  repos,
  space,
  parent
}) {
  if (!repos) {
    console.error("repos must be specifid.")
    process.exit(-1)
  }
  const repoArr = fs.readFileSync(repos, { encoding: 'utf-8' })
    .split('\n').map(i => i.trim()).filter(i => i !== '').map(i => {
      const split = i.split('/')
      return {
        owner: split[0],
        repo: split[1]
      }
    })

  let openedPrs = {}
  let mergedPrs = {}
  let reviewedPrs = {}
  for (const repo of repoArr) {
    const key = `${repo.owner}/${repo.repo}`
    openedPrs[key] = await getOpenedPrs(repo.owner, repo.repo, request, stopTime)
    mergedPrs[key] = await getMergedPrs(repo.owner, repo.repo, request, stopTime)
    reviewedPrs[key] = await getReviewedPrs(repo.owner, repo.repo, request, stopTime)
    openedPrs[key].reverse()
    mergedPrs[key].reverse()
    reviewedPrs[key].reverse()
  }
  
  // make report
  request.retry(request.confluencePostContent, space, formatDuration(stopTime, new Date()),
    makeContent(repoArr, openedPrs, mergedPrs, reviewedPrs, stopTime), parent)
}

async function getOpenedPrs(owner, repo, request, stopTime) {
  let finish = false
  let page = 0
  const pullRequests = []
  while (!finish) {
    page++
    console.log(`fetch opened PR ${owner}/${repo} page ${page}`)
    const pulls = await request.retry(request.getPrList, owner, repo, page, 'all', 'created')
    for (const item of pulls) {
      const created = new Date(item.created_at).getTime()
      if (created < stopTime) {
        finish = true
      } else {
        pullRequests.push(item)
      }
    }
    if (pulls.length < per_page) finish = true
  }
  return pullRequests
}

async function getMergedPrs(owner, repo, request, stopTime) {
  let finish = false
  let page = 0
  const pullRequests = []
  while (!finish) {
    page++
    console.log(`fetch merged PR ${owner}/${repo} page ${page}`)
    const pulls = await request.retry(request.getPrList, owner, repo, page, 'all', 'updated')
    for (const item of pulls) {
      if (!item.merged_at) {
        continue
      }
      const merged = new Date(item.created_at).getTime()
      if (merged < stopTime) {
        finish = true
      } else {
        pullRequests.push(item)
      }
    }
    if (pulls.length < per_page) finish = true
  }
  return pullRequests
}

async function getReviewedPrs(owner, repo, request, stopTime) {
  let finish = false
  let page = 0
  const pullRequests = []
  while (!finish) {
    page++
    console.log(`fetch reviewed PR ${owner}/${repo} page ${page}`)
    const pulls = await request.retry(request.getPrList, owner, repo, page, 'all', 'updated')
    for (const item of pulls) {
      // if (!item.merged_at) {
      //   continue
      // }
      const updated_at = new Date(item.updated_at || item.created_at).getTime()
      if (updated_at < stopTime) {
        finish = true
      } else {
        pullRequests.push(item)
        item.reviews = []
        const pullCommentsReviewIds = []
        let pullCommentPage = 1
        while(true) {
          const comments = await request.retry(request.getPullComments, owner, repo, item.number, new Date(stopTime).toISOString(), pullCommentPage)
          for (const comment of comments) {
            if (new Date(comment.created_at).getTime() < stopTime) {
              continue
            }
            if (MEMBER_ASSOCIATION.indexOf(comment.author_association) < 0) {
              continue
            }
            if (comment.user.login === item.user.login || comment.user.login === 'sre-bot') {
              continue
            }
            if (comment.body[0] === '/') {
              continue
            }
            pullCommentsReviewIds.push(comment.pull_request_review_id)
            item.reviews.push(comment.user.login)
          }
          if (comments.length < per_page) {
            break
          }
          pullCommentPage++
        }
        let pullReviewPage = 1
        while(true) {
          const reviews = await request.retry(request.getPullReviews, owner, repo, item.number, pullReviewPage)
          for (const review of reviews) {
            if (pullCommentsReviewIds.indexOf(review.id) >= 0 && review.body === '' && review.state === 'COMMENTED') {
              continue
            }
            if (new Date(review.submitted_at).getTime() < stopTime) {
              continue
            }
            if (MEMBER_ASSOCIATION.indexOf(review.author_association) < 0) {
              continue
            }
            if (review.user.login === item.user.login || review.user.login === 'sre-bot') {
              continue
            }
            if (review.body[0] === '/') {
              continue
            }
            item.reviews.push(review.user.login)
          }
          if (reviews.length < per_page) {
            break
          }
          pullReviewPage++
        }
        let issueCommentPage = 1
        while(true) {
          const comments = await request.retry(request.getIssueComments, owner, repo, item.number, new Date(stopTime).toISOString(), issueCommentPage)
          for (const comment of comments) {
            if (new Date(comment.created_at).getTime() < stopTime) {
              continue
            }
            if (MEMBER_ASSOCIATION.indexOf(comment.author_association) < 0) {
              continue
            }
            if (comment.user.login === item.user.login || comment.user.login === 'sre-bot') {
              continue
            }
            if (comment.body[0] === '/') {
              continue
            }
            item.reviews.push(comment.user.login)
          }
          if (comments.length < per_page) {
            break
          }
          issueCommentPage++
        }
        // item.reviews = [...new Set(item.reviews)]
      }
    }
    if (pulls.length < per_page) finish = true
  }
  return pullRequests.filter(i => i.reviews.length > 0)
}

function makeContent(repos, openedPrs, mergedPrs, reviewedPrs, stopTime) {
  let pullsCount =  0

  // prepare PR data
  let body = `\n<ul>
  <li style="list-style-type: none;background-image: none;">
    <ul>\n`
  for (const repo of repos) {
    const key = `${repo.owner}/${repo.repo}`
    const repoOpened = openedPrs[key]
      .filter(i => mergedPrs[key].find(j => j.number === i.number ) === undefined)
      .filter(i => reviewedPrs[key].find(j => j.number === i.number ) === undefined)
    const repoMerged = mergedPrs[key]
      .filter(i => reviewedPrs[key].find(j => j.number === i.number ) === undefined)
    const repoPulls = repoOpened.concat(repoMerged).concat(reviewedPrs[key]).sort((a, b) => a.number - b.number)

    pullsCount += repoPulls.length

    body += repoPulls.map(pull => {
      const pullTitle = pull.title.replace(/&/g, '&amp;')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      return `      <li>
        <a class="external-link" href="${pull.html_url}" rel="nofollow">${repo.repo}/${pullTitle} #${pull.number}</a>
      </li>`
    }).join('\n')
    body += '\n'
  }
  body += `    </ul>
  </li>
</ul>`

  let header = `<h2>
  <strong>Weekly Update </strong>
  <strong>(${formatDuration(stopTime, new Date())})</strong>
</h2>
<h3>
  <strong>Weekly Routine - PR statistics</strong>
</h3>
<ul>
  <li>
    <span style="color: rgb(0,0,0);">Align, update, and review documents in ${repos.map(i => i.repo).join('/')}<br/>
    </span>${pullsCount} PRs in ${repos.length} repos</li>
</ul>`

  let res = header + body
  return res + i18ntemplate
}


module.exports = report
module.exports.getReviewedPrs = getReviewedPrs
