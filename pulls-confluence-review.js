const fs = require('fs')
const { formatDuration, formatDateTime } = require('./utils')
const { per_page } = require('./request')
// const { MEMBER_ASSOCIATION } = require('./constant')


async function reviewReport(request, {
  channel,
  workload,
  stopTime,
  repos,
  space,
  parent,
  filter
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

  let reviewedPrs = {}
  for (const repo of repoArr) {
    const key = `${repo.owner}/${repo.repo}`
    reviewedPrs[key] = await getReviewedPrs(repo.owner, repo.repo, request, stopTime)
    reviewedPrs[key].reverse()
  }

  // make report
  const res = await request.retry(request.confluencePostContent, space, formatDuration(stopTime, new Date()) + ' PR Review Summary',
    makeContent(repoArr, reviewedPrs, stopTime, filter), parent)
  const url = request.config.confluence.endpoint + res.data._links.webui
  await request.retry(request.postSlackReport, channel, `PR Review Weekly (${formatDuration(stopTime, new Date())})`, url)
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
            if (!(await request.isMember(comment.user.login))) {
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
            if (!(await request.isMember(review.user.login))) {
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
            // if (MEMBER_ASSOCIATION.indexOf(comment.author_association) < 0) {
            //   continue
            // }
            if (comment.user.login === item.user.login
              || comment.user.login === 'sre-bot'
              || comment.user.login === 'codecov[bot]') {
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
  return pullRequests.filter(i => i.reviews.length > 0).sort((a, b) => b.number - a.number)
}

function makeContent(repos, reviewedPrs, stopTime, filter) {
  let reviewers = []
  for (const repo of repos) {
    const key = `${repo.owner}/${repo.repo}`
    for (const pull of reviewedPrs[key]) {
      reviewers = reviewers.concat(pull.reviews)
    }
  }
  if (filter) {
    reviewers = filter.do(reviewers, item => item)
  }
  let reviewCount = {}
  for (const login of reviewers) {
    if (!reviewCount[login]) reviewCount[login] = 0
    reviewCount[login]++
  }
  reviewers = [...new Set(reviewers)].sort((a, b) => reviewCount[b] -  reviewCount[a])

  let res = `<p class="auto-cursor-target">
  <br/>
</p>
<ac:structured-macro ac:name="markdown" ac:schema-version="1">
  <ac:plain-text-body><![CDATA[a week ago is: ${formatDateTime(stopTime)} +0800 CST
# Weekly PR Review Report:\n`

  let logins = []
  for (login of reviewers) {
    let count = 0
    let list = []
    for (const repo of repos) {
      const key = `${repo.owner}/${repo.repo}`
      for (const pull of reviewedPrs[key]) {
        if (pull.reviews.indexOf(login) >= 0) {
          count++
          list.push({
            repo: key,
            number: pull.number,
            title: pull.title,
            comment: pull.reviews.filter(i => i === login).length,
            url: pull.html_url,
            author: pull.user.login,
            authorUrl: pull.user.html_url
          })
        }
      }
    }
    logins.push({
      login,
      count,
      list
    })
  }

  if (filter) {
    
  } else {
    logins = logins.sort((a, b) => b.count - a.count)
  }

  res += logins.map(login => {
    let r = `**${login.login}** has reviewed **${login.count}** ${login.count > 1 ? 'PRs' : 'PR'}:\n`
    r += login.list.map(item => {
      let line = `- ${item.comment} Comments on `
      line += `[\\[${item.repo}#${item.number}, ${item.title}\\]]`
      line += `(${item.url}), `
      line += `**Author**: [${item.author}](${item.authorUrl})`
      return line
    }).join('\n')
    return r
  }).join('\n\n')

  res += `]]></ac:plain-text-body>
  </ac:structured-macro>
  <p class="auto-cursor-target">
    <br/>
  </p>`

  return res.replace(/&/g, '&amp;')
}

module.exports = reviewReport
