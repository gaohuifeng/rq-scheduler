# rq-scheduler
## Installation
npm install rq-scheduler
## Usage
```js
const TQueue = require('rq-scheduler')
const tQueue = new TQueue({prefix: 'TQ1', interval: 1000})

// connect to redis cluster
// if you have 3 redis, can set TQueue.connect([6379, 6380, 6381])
const tq = tQueue.connect([6379])
// tq.on('error', callback)
// tq.on('close', callback)

// create 'test' job queue in timed-queue instance
const testQueue = tQueue.tQueue('test')

// add 'job' listener
testQueue.on('job', function (jobObj) {
  // ... just do some thing
  // ACK the job
  // jobObj : {
  //   queue: 'testetst',
  //   job: '121$6bcef79e64fd41db9c9972d923cd49c9',
  //   timing: 1531914416025,
  //   active: 1531927285969,
  //   retryCount: 92 }
  console.log('job id: ', jobObj.job.split('$')[0])
  testQueue.ackjob(jobObj.job)
})

// add job to queue
// promise
Promise.all([
  testQueue.addjob('121', new Date().getTime() + 5000),
  testQueue.addjob('121', new Date().getTime() + 10000)
])

// testQueue.show()
// or generator
require('co')(function * () {
  yield [
    testQueue.addjob('121', new Date().getTime() + 5000),
    testQueue.addjob('121', new Date().getTime() + 10000)
  ]
})

// delete job
// return promise
testQueue.deljob('121')

```
## Comparison with `Timed Queue`
It is base on [Timed Queue](https://github.com/teambition/timed-queue) And >**support one job add multi-time** 

