# GitHub Analyze

A small tools to help you with pull requests, issues and contributors management.

* [Configuration](#Configuration)
* [Command](#Command)
* [Build](#Build)
* [Options](#Options)
* [Workloads](#Workloads)
  * [new contributor](#new-contributor)
  * [pulls report](#pulls-report)
  * [issues report](#issues-report)
  * [contributors pull requests statistic](#contributors-pull-requests-statistic)
  * [find slow review](#find-slow-review)

## Configuration

Rename `config.example.json` to `config.json`, and fill in the fields.

```json
{
  "token": "your github token",
  "slack": "slack token if used",
  "confluence": {
    "username": "",
    "password": "",
    "endpoint": ""
  }
}
```

## Command

```
Usage: app [options]

Options:
  -V, --version            output the version number
  -w, --workload <string>  workload name
  -o, --owner <string>     github account login name
  -r, --repo <string>      github repository name
  --channel <string>       Slack channel which will receive report, default #github-weekly-report
  --contributor <boolean>  if only works for contributor, for pulls statistic, default false
  --duration <number>      day number for common workload, default 7
  --filter <string>        path to user filter file, file content should be "user1\nuser2\nuser3"
  --repos <string>         path to repolist, for "pulls-confluence" workload
  --space <string>         space name when post to confluence
  --parent <number>        page id of parent page in confluence
  -h, --help               output usage information
```

## Build

Rename `config.example.json` to `config.json` and edit it.

This will combine nodejs runtime, `config.json`, `node_modules` and scripts into a binary.

**DO NOT GIVE YOUR BINARY TO OTHERS**, because your tokens are in it.

```
# with npm
npm run build
# with yarn
yarn build
```

To use binary, replace `node app.js` with `./github-analyse`.

## Options

`channel` Slack channel to send result

`contributor` If only for contributor

`filter` For `contributor-pulls-statistic` workload only, indicate a filter file.

Example

```
node app.js -w contributor-pulls-statistic -o tikv -r tikv --channel github-weekly-report --contributor true --filter ./filter.txt
```

`filter.txt`

```
you06,you07
```

## Workloads

### new contributor

`new-contributor` workload will send into Slack Channel

* Get new contributors last week(contributor only, exclude members)

```
node app.js -w new-contributor --contributor true -o tikv -r tikv
```

* Get new contributors last week(contributor only, include members)

```
node app.js -w new-contributor -o tikv -r tikv
```

### pulls report

* Get pulls request report last month

```
node app.js -w pulls-report -o tikv -r tikv --duration 7 --channel github-weekly-report
```

Cheat options
```
node app.js -w weekly-pulls-report -o tikv -r tikv --channel github-weekly-report
node app.js -w monthly-pulls-report -o tikv -r tikv --channel github-weekly-report
```

Output

```
tikv/tikv: Opened 153 PRs
102 merged, average using 1.8d, merge time 90% 4.1d
21 closed, average using 3.8d, closed time 90% 10d
30 opened, average opened 4.6d, opened time 90% 12d
The PR lives longest is 5142, opened 18dhttps://github.com/tikv/tikv/pull/5142
No-Update Leaderboard
#5142 14d https://github.com/tikv/tikv/pull/5142
#5170 12d https://github.com/tikv/tikv/pull/5170
#5181 7d https://github.com/tikv/tikv/pull/5181
#5229 5.2d https://github.com/tikv/tikv/pull/5229
#5220 5.2d https://github.com/tikv/tikv/pull/5220
```

### issues report

* Get issues request report last month

```
node app.js -w issues-report -o tikv -r tikv --duration 7 --channel github-weekly-report
```

Cheat options
```
node app.js -w weekly-issues-report -o tikv -r tikv --channel github-weekly-report
node app.js -w monthly-issues-report -o tikv -r tikv --channel github-weekly-report
```

Output

```
tikv/tikv: Opened 33 issues
7 closed, average using 1.6d, closed time 90% 3.6d
26 opened, average opened 11d, opened time 90% 20d
The PR lives longest is #5101, opened 27d https://github.com/tikv/tikv/issues/5101
No-Update Leaderboard
#5101 21d https://github.com/tikv/tikv/issues/5101
#5122 21d https://github.com/tikv/tikv/issues/5122
#5136 18d https://github.com/tikv/tikv/issues/5136
#5130 18d https://github.com/tikv/tikv/issues/5130
#5124 18d https://github.com/tikv/tikv/issues/5124
```

### contributors pull requests statistic

* Get contributors statistic

```
node app.js -w contributor-pulls-statistic -o tikv -r tikv --channel github-weekly-report
```

Output csv file 

```
[GitHub username], [accepted PR], [total PR], [GitHub query link for user's PR], [component labels of accepted PRs]
```

example

```
GitHub, merged, pulls, check it out, components
you06, 11, 17, https://github.com/tikv/tikv/pulls?q=is%3Amerged+is%3Apr+author%3Ayou06, 
you07, 3, 5, https://github.com/tikv/tikv/pulls?q=is%3Amerged+is%3Apr+author%3Ayou07, component/ci | component/bot
```

### find slow review

* find slow reviews in a repo

```
node app.js -o tikv -r tikv -w slow-review
```

* do this job for the given label, and if you have emoji in your label, I recommand using like this

```
node app.js -o tikv -r tikv -w slow-review --label "T: Contributor*" 
```
