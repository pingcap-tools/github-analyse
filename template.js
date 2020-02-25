const fs = require('fs')

const i18ntemplate = fs.readFileSync('./template.txt', {encoding: 'utf-8'})

module.exports.i18ntemplate = i18ntemplate
