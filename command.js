const {
  DEFAULT_CHANNEL
} = require('./constant')

module.exports = (program) => {
  program
  .option('-w, --workload <string>', `workload name`)
  .option('-o, --owner <string>', 'github account login name')
  .option('-r, --repo <string>', 'github repository name')
  .option('-c, --config <string>', 'config file')
  .option('--label, --label <string>', 'specify a label')
  .option('--channel <string>', `Slack channel which will receive report, default ${DEFAULT_CHANNEL}`)
  .option('--contributor <boolean>', 'if only works for contributor, for pulls statistic, default false')
  .option('--duration <number>', 'day number for common workload, default 7')
  .option('--filter <string>', 'path to user filter file, file content should be "user1\\nuser2\\nuser3"')
  .option('--repos <string>', 'path to repolist, for "pulls-confluence" workload')
  .option('--space <string>', 'space name when post to confluence')
  .option('--parent <number>', 'page id of parent page in confluence')
}
