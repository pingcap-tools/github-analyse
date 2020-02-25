module.exports.calcDuration = (t1, t2) => {
  return new Date(t2).getTime() - new Date(t1).getTime()
}

module.exports.formatTime = (milisecond) => {
  const hour = milisecond / (1000 * 3600)
  if (hour < 24) {
    return hour.toFixed(1) + 'h'
  } else if (hour < 24 * 30) {
    const day = hour / 24
    if (day < 7) {
      return day.toFixed(1) + 'd'
    } else {
      return Math.floor(day) + 'd'
    }
  } else if (hour < 24 * 30 * 12) {
    const month = hour / 24 / 30
    return month.toFixed(1) + 'm'
  } else {
    const year = hour / 24 / 30 / 12
    return year.toFixed(1) + 'y'
  }
}

module.exports.formatDuration = (t1, t2) => {
  t1 = Object.prototype.toString.call(t1) === '[object Date]' ? t1 : new Date(t1)
  t2 = Object.prototype.toString.call(t2) === '[object Date]' ? t2 : new Date(t2)
  return `${formatDate(t1)} - ${formatDate(t2)}`
}

function formatDate(t) {
  return `${t.getFullYear()}-${
    t.getMonth() + 1 < 10 ? '0' + (t.getMonth() + 1) : (t.getMonth() + 1)
  }-${
    t.getDate() < 10 ? '0' + t.getDate() : t.getDate()
  }`
}

module.exports.formatDate = formatDate

module.exports.formatDateTime = (t) => {
  t = Object.prototype.toString.call(t) === '[object Date]' ? t : new Date(t)
  const date = formatDate(t)
  return `${date} ${
    t.getHours() < 10 ? '0' + t.getHours() : t.getHours()
  }:${
    t.getMinutes() < 10 ? '0' + t.getMinutes() : t.getMinutes()
  }:${
    t.getSeconds() < 10 ? '0' + t.getSeconds() : t.getSeconds()
  }`
}

module.exports.combineContributor = (arr) => {
  const res = []
  for (const r of arr) {
    for (const g of r.res) {
      if (!res.find(i => i.login === g.login)) {
        res.push({
          login: g.login,
          merged: 0,
          repos: {}
        })
      }
      const item = res.find(i => i.login === g.login)
      item.merged += g.merged
      item.repos[g.repo] = g.merged
    }
  }

  res.sort((a, b) => b.merged - a.merged)

  const repos = [
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
  ]

  let output = `GitHub, merged`
  for (const repo of repos) {
    output += `, ${repo.owner}/${repo.repo}`
  }
  output += '\n'
  for (const item of res) {
    output += `${item.login}, ${item.merged}`
    for (const repo of repos) {
      const key = `${repo.owner}/${repo.repo}`
      if (item.repos[key]) {
        output += `, ${item.repos[key]}`
      } else {
        output += ', 0'
      }
    }
    output += '\n'
  }

  console.log(output)
}
