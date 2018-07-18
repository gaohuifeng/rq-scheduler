iconst TimedQueue = require('timed-queue')
const uuidv4 = require('uuid/v4')
const thunk = require('thunks')()

class TQueue extends TimedQueue {
  constructor (options) {
    options = options || {}
    super(options)
  }

  tQueue (queueName, options) {
    const queue = super.queue(queueName, options)
    const originAddJobFn = queue.addjob
    const originDelFn = queue.deljob

    Object.defineProperty(queue, 'addjob', {
      get: () => async function (job, timing) {
        const self = this
        return new Promise(function (resolve, reject) {
          originAddJobFn.call(self, attachUUID(job), timing)(function (err, result) {
            if (err) return reject(err)
            resolve(result)
          })
        })
      }
    })

    Object.defineProperty(queue, 'deljob', {
      get: () => async function (job) {
        const pattern = job + '$*'
        const self = this
        const jobIds = await getAllJobsById.call(this, pattern)
        jobIds.push(job)
        return new Promise(function (resolve, reject) {
          originDelFn.call(self, jobIds)(function (err, result) {
            if (err) return reject(err)
            resolve(result)
          })
        })
      }
    })
    return queue
  }
}

function attachUUID (str) {
  if (str.indexOf('$') > 0) throw new TypeError(`${String(str)} should not contain retain word: $`)
  return str + '$' + uuidv4().replace(/-/g, '')
}

async function getAllJobsById (pattern, cursor = 0) {
  const self = this
  const d = await new Promise(function (resolve, reject) {
    thunk(function * () {
      return yield self.root.redis.zscan(self.queueKey, cursor, 'match', pattern)
    })(function (err, result) {
      if (err) return reject(err)
      resolve(result)
    })
  })

  const nextCursor = d[0]
  const data = filer(d[1])
  if (nextCursor === '0') {
    return filer(data)
  } else {
    const next = await getAllJobsById(pattern, nextCursor)
    return data.concat(filer(next[1]))
  }
}

function filer (dataArray) {
  let rst = []
  for (let i = 0, l = dataArray.length; i < l; i += 2) {
    rst.push(dataArray[i])
  }
  return rst
}

module.exports = TQueue

