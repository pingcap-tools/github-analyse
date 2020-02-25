const per_page = require('./request').per_page
const { MEMBER_ASSOCIATION } = require('./constant')

async function getNewContributor(request, owner, repo, {
  channel,
  stopTime,
  ifContributor
}) {
  let finish = false
  let page = 0
  const users = []
  while (!finish) {
    page++
    console.log(`fetch page ${page}`)
    const pulls = await request.retry(request.getPrList, owner, repo, page, 'closed', 'updated')
    if (pulls.length < per_page) finish = true
    for (item of pulls) {
      if (new Date(item.updated_at).getTime() < stopTime) {
        finish = true
      }
      if (!item.merged_at) {
        continue
      }
      const merged = new Date(item.merged_at).getTime()
      const association = item.author_association
      const login = item.user.login
      const ifmerged = item.merged_at && item.merged_at != ""
      if (merged < stopTime) {
        continue
      }
      if (MEMBER_ASSOCIATION.indexOf(association) >= 0 && ifContributor) {
        continue
      }
      const user = users.find(i => i.login === login)
      if (!user) {
        // const userinfo = await request.retry(request.getCommit, owner, repo, item.head.sha)
        // const email = userinfo.author.email || userinfo.committer.email
        const email = await request.retry(request.getEmail, owner, repo, item.number)
        users.push({
          login,
          association,
          count: 1,
          merged: ifmerged ? 1 : 0,
          email
        })
      } else {
        user.count++
        if (ifmerged) user.merged++
      }
    }
  }

  users.sort((a, b) => b.merged - a.merged)
  let contributorUsers = users
  contributorUsers = contributorUsers.filter(i => i.merged > 0)
  if (ifContributor === true) {
    contributorUsers = contributorUsers.filter(i => i.association === 'CONTRIBUTOR')
  }
  const ifNewContributor = {}
  for (const user of contributorUsers) {
    ifNewContributor[user.login] = true
    let page = 0
    while (true) {
      page++
      const pulls = await request.retry(request.searchPr, owner, repo, page, user.login, 'merged')
      pulls.items.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
      for (const pull of pulls.items) {
        if (new Date(pull.closed_at).getTime() < stopTime) {
          ifNewContributor[user.login] = false
          break
        }
      }
      if (!ifNewContributor[user.login]) break
      if (pulls.items.length < per_page) break
    }
  }
  contributorUsers = contributorUsers.filter(i => ifNewContributor[i.login])

  const res = []
  for (const user of contributorUsers) {
    // const file = `./pulls-${owner}-${repo}-new-contributor.csv`
    // const url = `https://github.com/${owner}/${repo}/pulls?q=is%3Amerged+is%3Apr+author%3A${user.login}`
    // const line = `${user.login}, ${user.merged}, ${user.count}, ${url}\n`
    // fs.writeFileSync(file, line, {flag: 'a'})
    const line = `* [${user.login}](https://github.com/${user.login}), email:${user.email}`
    res.push(line)
  }
  const contributorText = res.join('\n') || `No new contributors`
  const text = `${contributorText}`
  const title = `${owner}/${repo} new contributors`

  request.retry(request.postSlackReport, channel, title, text)
}

module.exports = getNewContributor
