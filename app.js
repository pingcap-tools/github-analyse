const program = require('commander')
const Request = require('./request').request
const Filter = require('./filter')
const config = require('./config.json')
const commandWrapper = require('./command')
const getNewContributor = require('./get-new-contributors')
const pullsReport = require('./pulls-report')
const issuesReport = require('./issues-report')
const contributorPullsStatistic = require('./contributor-pulls-statistic')
const pullsConfluence = require('./pulls-confluence')
const reviewReport = require('./pulls-confluence-review')
const openedPulls = require('./opened-pull')
const slowReview = require('./slow-review')
const { combineContributor } = require('./utils')

const {
  DEFAULT_CHANNEL
} = require('./constant')

program.version('1.0.0')

commandWrapper(program)

program.parse(process.argv)

main()

async function main() {
  const workload = program.workload
  const owner = program.owner
  const repo = program.repo
  const label = program.label
  const channel = program.channel || DEFAULT_CHANNEL
  const duration = parseInt(program.duration) || 7
  const ifContributor = program.contributor === 'true'
  const filter = program.filter ? new Filter(program.filter) : undefined
  const repos = program.repos
  const space = program.space
  const parent = parseInt(program.parent)

  if (!owner && !repos) {
    console.log('owner not specified.')
    process.exit(-1)
  }
  if (!repo && !repos) {
    console.log('repo not specified.')
    process.exit(-1)
  }
  if (!workload) {
    console.log('workload not specified.')
    process.exit(-1)
  }

  console.log(new Date().toString(), `workload ${workload} starting`)

  switch (workload) {
    case 'new-contributor': {
      const stopTime = new Date().getTime() - duration * 24 * 3600 * 1000
      await getNewContributor(new Request(config), owner, repo, {
        ifContributor,
        channel,
        stopTime
      })
      break
    }
    case 'pulls-report': {
      const stopTime = new Date().getTime() - duration * 24 * 3600 * 1000
      await pullsReport(new Request(config), owner, repo, {
        channel,
        workload,
        stopTime
      })
      break
    }
    case 'issues-report': {
      const stopTime = new Date().getTime() - duration * 24 * 3600 * 1000
      await issuesReport(new Request(config), owner, repo, {
        channel,
        workload,
        stopTime
      })
      break
    }
    case 'weekly-pulls-report': {
      const stopTime = new Date().getTime() - 7 * 24 * 3600 * 1000
      await pullsReport(new Request(config), owner, repo, {
        channel,
        workload,
        stopTime
      })
      break
    }
    case 'weekly-issues-report': {
      const stopTime = new Date().getTime() - 7 * 24 * 3600 * 1000
      await issuesReport(new Request(config), owner, repo, {
        channel,
        workload,
        stopTime
      })
      break
    }
    case 'monthly-pulls-report': {
      const stopTime = new Date().getTime() - 30 * 24 * 3600 * 1000
      await pullsReport(new Request(config), owner, repo, {
        channel,
        workload,
        stopTime
      })
      break
    }
    case 'monthly-issues-report': {
      const stopTime = new Date().getTime() - 30 * 24 * 3600 * 1000
      await issuesReport(new Request(config), owner, repo, {
        channel,
        workload,
        stopTime
      })
      break
    }
    case 'contributor-pulls-statistic': {
      const stopTime = new Date().getTime() - duration * 24 * 3600 * 1000
      await contributorPullsStatistic(new Request(config), owner, repo, {
        channel,
        workload,
        stopTime,
        ifContributor,
        filter
      })
      break
    }
    case 'contributor-pulls-statistic-multi-repo': {
      const stopTime = new Date().getTime() - duration * 24 * 3600 * 1000
      const arr = []
      for (const r of [
        {
          owner: 'tikv',
          repo: 'tikv'
        },
        {
          owner: 'pingcap',
          repo: 'pd'
        },
        {
          owner: 'pingcap',
          repo: 'grpc-rs'
        },
        {
          owner: 'pingcap',
          repo: 'raft-rs'
        },
        {
          owner: 'pingcap',
          repo: 'rust-prometheus'
        },
      ]) {
        const res = await contributorPullsStatistic(new Request(config), r.owner, r.repo, {
          channel,
          workload,
          stopTime,
          ifContributor,
          filter
        })
        arr.push({
          name: `${r.owner}/${r.repo}`,
          res
        })
      }

      combineContributor(arr)

      break
    }
    case 'pulls-confluence': {
      const stopTime = new Date().getTime() - duration * 24 * 3600 * 1000
      await pullsConfluence(new Request(config), {
        channel,
        workload,
        stopTime,
        repos,
        space,
        parent
      })
      break
    }
    case 'pulls-confluence-review': {
      const stopTime = new Date().getTime() - duration * 24 * 3600 * 1000
      await reviewReport(new Request(config), {
        channel,
        workload,
        stopTime,
        repos,
        space,
        parent,
        filter
      })
      break
    }
    case 'opened-pulls': {
      const stopTime = new Date().getTime() - duration * 24 * 3600 * 1000
      await openedPulls(new Request(config), owner, repo, {
        channel,
        workload,
        stopTime
      })
      break
    }
    case 'slow-review': {
      await slowReview(new Request(config), owner, repo, {
        label
      })
    }
    default:
      console.log(`unsupported workload. ${workload}`)
  }
}
