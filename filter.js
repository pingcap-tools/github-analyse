const fs = require('fs')


module.exports = class {
  constructor(filePath) {
    try {
      this.filter = fs.readFileSync(filePath, { encoding: 'utf-8' }).toLowerCase()
        .split(',').map(i => i.trim()).map(i => i.split('\n')).reduce((a, b) => a.concat(b))
    } catch(e) {
      console.error(e)
      process.exit(-1)
    }
  }

  do(list, fn) {
    return list.filter(item => this.filter.indexOf(fn(item).toLowerCase()) >= 0)
  }

  sort(item) {
    return list.indexOf(item) >= 0
  }
}
