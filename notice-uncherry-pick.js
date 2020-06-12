const { per_page, request } = require('./request')
const readFile = require('util').promisify(require('fs').readFile)

main()

async function main() {
  const content = await readFile('./pulls.txt', {encoding: 'utf-8'})
  const contents = content.split('\n').map(i => i.split(',').map(j => j.trim()))

  const r = new request({
    token: 'ec4e2bfa0723fa4d2b65a71e6db2199cfe0f5a40'
  })

  const pullMap = {}
  for (const [, release, pull] of contents) {
    const m = /\/pingcap\/tidb\/pull\/(\d+)$/.exec(pull)
    const pullNumber = parseInt(m[1])
    if (pullMap[pullNumber] === undefined) {
      pullMap[pullNumber] = [release]
    } else {
      pullMap[pullNumber].push(release)
    }
  }

  for (const pullNumber in pullMap) {
    const reviewer = await findReviewer(r, pullNumber)
    console.log(`${pullNumber},${pullMap[pullNumber].join(' ')},https://github.com/pingcap/tidb/pull/${pullNumber},${reviewer}`)
    // const body = `It seems that, not for sure, we failed to cherry-pick this commit to ${pullMap[pullNumber].join(' ')}. Please comment '/run-cherry-picker' to try to trigger the cherry-picker if we did fail to cherry-pick this commit before. @${reviewer} PTAL.`

    // console.log(pullNumber, body)

    // await r.octokit.issues.createComment({
    //   owner: 'pingcap',
    //   repo: 'tidb',
    //   issue_number: pullNumber,
    //   body,
    // })
  }
}

async function findReviewer(r, pullNumber) {
  const pull = (await r.octokit.pulls.get({
    owner: 'pingcap',
    repo: 'tidb',
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
