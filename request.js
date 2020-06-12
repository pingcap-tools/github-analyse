const { createReadStream } = require('fs')
const axios = require('axios')
const Octokit = require('@octokit/rest')
const { WebClient } = require('@slack/web-api')
const Confluence = require('./confluence')

const MaxReretTime = 3
const per_page = 50

function getOctokit(config) {
  return new Octokit({
    auth: config.token
  })
}

function getSlack(config) {
  return new WebClient(config.slack)
}

module.exports.request = class {
  constructor (config) {
    this.per_page = per_page
    this.config = config
    this.octokit = getOctokit(config)
    this.slack = getSlack(config)
    this.member = {}
    if (config.confluence) {
      this.confluence = new Confluence({
        username: config.confluence.username,
        password: config.confluence.password,
        baseUrl: config.confluence.endpoint,
        version: 4
      })
    }
  }

  async retry(fn, ...args) {
    for (let i = 0; i < MaxReretTime; i++) {
      try {
        const res = await fn.call(this, ...args)
        return res
      } catch(e) {
        if (i === MaxReretTime - 1) {
          console.log(e)
        }
      }
    }
    console.log(`retry over ${MaxReretTime} times, exit`)
    process.exit(1)
  }

  async getPrList(owner, repo, page, state, sort = 'created', direction='desc') {
    return new Promise((resolve, reject) => {
      this.octokit.pulls.list({
        owner,
        repo,
        state,
        direction,
        sort,
        per_page,
        page
      }).then(res => {
        const { status, headers, data } = res
        const limit = parseInt(headers['x-ratelimit-remaining'])
        if (limit % 100 == 0) {
          console.log(`x-ratelimit-remaining: ${limit}`)
        }
        if (limit < 10) {
          setTimeout(() => {
            resolve(data)
          }, 3700 * 1000)
        } else {
          resolve(data)
        }
      }).catch(reason => {
        reject(reason)
      })
    })
  }

  async getAPr(owner, repo, pull_number) {
    return new Promise((resolve, reject) => {
      this.octokit.pulls.list({
        owner,
        repo,
        pull_number
      }).then(res => {
        const { status, headers, data } = res
        const limit = parseInt(headers['x-ratelimit-remaining'])
        if (limit % 100 == 0) {
          console.log(`x-ratelimit-remaining: ${limit}`)
        }
        if (limit < 10) {
          setTimeout(() => {
            resolve(data)
          }, 3700 * 1000)
        } else {
          resolve(data)
        }
      }).catch(reason => {
        reject(reason)
      })
    })
  }

  async searchPr(owner, repo, page, user, stat) {
    return new Promise((resolve, reject) => {
      this.octokit.search.issuesAndPullRequests({
        q: `repo:${owner}/${repo}+is:pr+is:${stat}+author:${user}`,
        per_page,
        page
      }).then(res => {
        const { status, headers, data } = res
        const limit = parseInt(headers['x-ratelimit-remaining'])
        if (limit % 5 == 0) {
          console.log(`x-ratelimit-remaining: ${limit}`)
        }
        if (limit < 5) {
          setTimeout(() => {
            resolve(data)
          }, 60 * 1000)
        } else {
          resolve(data)
        }
      }).catch(reason => {
        reject(reason)
      })
    })
  }

  async getIssueList(owner, repo, page, state) {
    return new Promise((resolve, reject) => {
      this.octokit.issues.listForRepo({
        owner,
        repo,
        state,
        direction: 'desc',
        sort: 'created',
        per_page,
        page
      }).then(res => {
        const { status, headers, data } = res
        const limit = parseInt(headers['x-ratelimit-remaining'])
        if (limit % 100 == 0) {
          console.log(`x-ratelimit-remaining: ${limit}`)
        }
        if (limit < 10) {
          setTimeout(() => {
            resolve(data)
          }, 3700 * 1000)
        } else {
          resolve(data)
        }
      }).catch(reason => {
        reject(reason)
      })
    })
  }

  async getUser(username) {
    return new Promise((resolve, reject) => {
      this.octokit.users.getByUsername({
        username
      }).then(res => {
        const { status, headers, data } = res
        const limit = parseInt(headers['x-ratelimit-remaining'])
        if (limit % 100 == 0) {
          console.log(`x-ratelimit-remaining: ${limit}`)
        }
        if (limit < 10) {
          setTimeout(() => {
            resolve(data)
          }, 3700 * 1000)
        } else {
          resolve(data)
        }
      }).catch(reason => {
        reject(reason)
      })
    })
  }

  async getCommit(owner, repo, commit_sha) {
    return new Promise((resolve, reject) => {
      this.octokit.git.getCommit({
        owner,
        repo,
        commit_sha
      }).then(res => {
        const { status, headers, data } = res
        const limit = parseInt(headers['x-ratelimit-remaining'])
        if (limit < 10) {
          setTimeout(() => {
            resolve(data)
          }, 3700 * 1000)
        } else {
          resolve(data)
        }
      }).catch(reason => {
        reject(reason)
      })
    })
  }

  async getTimeline(owner, repo, issue_number) {
    return new Promise((resolve, reject) => {
      this.octokit.issues.listEventsForTimeline({
        owner,
        repo,
        issue_number
      }).then(res => {
        const { status, headers, data } = res
        const limit = parseInt(headers['x-ratelimit-remaining'])
        if (limit < 10) {
          setTimeout(() => {
            resolve(data)
          }, 3700 * 1000)
        } else {
          resolve(data)
        }
      }).catch(reason => {
        reject(reason)
      })
    })
  }

  async getPullReviews(owner, repo, pull_number, page) {
    return new Promise((resolve, reject) => {
      this.octokit.pulls.listReviews({
        owner,
        repo,
        pull_number,
        page,
        per_page
      }).then(res => {
        const { status, headers, data } = res
        const limit = parseInt(headers['x-ratelimit-remaining'])
        if (limit < 10) {
          setTimeout(() => {
            resolve(data)
          }, 3700 * 1000)
        } else {
          resolve(data)
        }
      }).catch(reason => {
        reject(reason)
      })
    }) 
  }

  async getPullComments(owner, repo, pull_number, since, page) {
    return new Promise((resolve, reject) => {
      this.octokit.pulls.listComments({
        owner,
        repo,
        pull_number,
        since,
        page
      }).then(res => {
        const { status, headers, data } = res
        const limit = parseInt(headers['x-ratelimit-remaining'])
        if (limit < 10) {
          setTimeout(() => {
            resolve(data)
          }, 3700 * 1000)
        } else {
          resolve(data)
        }
      }).catch(reason => {
        reject(reason)
      })
    })
  }

  async getIssueComments(owner, repo, issue_number, since, page) {
    return new Promise((resolve, reject) => {
      this.octokit.issues.listComments({
        owner,
        repo,
        issue_number,
        since,
        page
      }).then(res => {
        const { status, headers, data } = res
        const limit = parseInt(headers['x-ratelimit-remaining'])
        if (limit < 10) {
          setTimeout(() => {
            resolve(data)
          }, 3700 * 1000)
        } else {
          resolve(data)
        }
      }).catch(reason => {
        reject(reason)
      })
    })
  }

  async isMember(username) {
    if (this.member[username] === true) {
      return true
    } else if (this.member[username] === false) {
      return false
    }
    const isPingcapMember = await this.retry(this.isMemberRequest, 'pingcap', username)
    const isTikvMember = await this.retry(this.isMemberRequest, 'tikv', username)
    this.member[username] = isPingcapMember || isTikvMember
    return this.member[username]
  }

  async isMemberRequest(org, username) {
    return new Promise((resolve, reject) => {
      this.octokit.orgs.checkMembership({
        org,
        username
      }).then(res => {
        const { status } = res
        if (status === 204) {
          resolve(true)
        } else {
          resolve(false)
        }
      }).catch(reason => {
        if (reason.status === 404) {
          resolve(false)
        }
        reject(reason)
      })
    })
  }

  async getEmail(owner, repo, number) {
    // const patchUrl = `https://github.com/${owner}/${repo}/pull/${number}.patch`
    const patchUrl = `https://patch-diff.githubusercontent.com/raw/${owner}/${repo}/pull/${number}.patch`
    return new Promise((resolve, reject) => {
      axios.get(patchUrl)
      .then(({ status, data }) => {
        if (status != 200) {
          reject(status)
        }
        const line = data.split('\n')[1]
        const m = line.match(/<(.*)>$/)
        if (m && m[1]) {
          resolve(m[1])
        } else {
          resolve('')
        }
      })
      .catch(err => {
        console.log('dl patch fail', err)
        reject(err)
      })
    })
  }

  async postSlackReport(channel, title, text) {
    const lines = text.split('\n')
    const groups = [[]]
    for (let i = 0; i < lines.length; i++) {
      if ((i + 1) % 10 == 0) {
        groups.push([lines[i]])
      } else {
        groups[groups.length - 1].push(lines[i])
      }
    }
    const blocks = groups.map(lines => {
      let content = lines.join('\n')
      if (content === '') content = '\n'
      return {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `\`\`\`${content}\`\`\``
        }
      }
    })

    const res = await this.slack.chat.postMessage({
      channel,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: title
          }
        },
        ...blocks
      ],
      mrkdwn: true
    })
    return res.ok
  }

  async postSlackFile(channel, title, file) {
    const res = await this.slack.files.upload({
      // token: this.config.slack,
      channels: channel,
      filename: title,
      file: createReadStream(file)
    })
    return res.ok
  }

  // async confluenceGetContent()
  async confluencePostContent(space, title, content, parentId) {
    const res = await this.confluence.postContent({
      space,
      title,
      content,
      parentId
    })
    if (res.status !== 200) {
      throw new Error(res.statusText)
    }
    return res
  }
}

module.exports.per_page = per_page
