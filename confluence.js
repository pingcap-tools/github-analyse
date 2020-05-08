const axios = require('axios')

module.exports = class {
  constructor({
    username,
    password,
    baseUrl,
    version
  }) {
    this.username = username
    this.password = password
    this.baseUrl = baseUrl
    this.version = version
  }

  async postContent({
    space,
    title,
    content,
    parentId
  }) {
    const url = `${this.baseUrl}/rest/api/content/`
    const data = {
      type: 'page',
      title,
      ancestors:[{id: parentId}],
      space: {
        key: space
      },
      body: {
        storage: {
          value: content,
          representation: 'storage'
        }
      }
    }
    const token = Buffer.from(`${this.username}:${this.password}`, 'utf8').toString('base64')

    const res = await axios.post(url, data, {
      method: 'post',
      auth: {
        username: this.username,
        password: this.password
      },
      headers: {
        Authorization: token
      }
    })
    return res
  }
}
