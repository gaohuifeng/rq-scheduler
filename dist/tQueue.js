'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

let getAllJobsById = (() => {
  var _ref4 = (0, _asyncToGenerator3.default)(function* (pattern, cursor) {
    const self = this;
    // for support node v4.5, not use func default assignment: cursor = 0
    cursor = cursor || 0;
    const d = yield new _promise2.default(function (resolve, reject) {
      thunk(function* () {
        return yield self.root.redis.zscan(self.queueKey, cursor, 'match', pattern);
      })(function (err, result) {
        if (err) return reject(err);
        resolve(result);
      });
    });

    const nextCursor = d[0];
    const data = filer(d[1]);
    if (nextCursor === '0') {
      return filer(data);
    } else {
      const next = yield getAllJobsById(pattern, nextCursor);
      return data.concat(filer(next[1]));
    }
  });

  return function getAllJobsById(_x5, _x6) {
    return _ref4.apply(this, arguments);
  };
})();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const TimedQueue = require('timed-queue');
const uuidv4 = require('uuid/v4');
const thunk = require('thunks')();
class TQueue extends TimedQueue {
  constructor(options) {
    options = options || {} || '';
    super(options);
  }

  tQueue(queueName, options) {
    const queue = super.queue(queueName, options);
    const originAddJobFn = queue.addjob;
    const originDelFn = queue.deljob;
    const originGetjobsFn = queue.getjobs;

    Object.defineProperty(queue, 'addjob', {
      get: () => (() => {
        var _ref = (0, _asyncToGenerator3.default)(function* (job, timing) {
          const self = this;
          return new _promise2.default(function (resolve, reject) {
            // job: '5b4d4dccaabd71111111111c'
            // attachUUID(job): '5b4d4dccaabd71111111111c$0111111111114349a338f16ef715fcd5'
            originAddJobFn.call(self, attachUUID(job), timing)(function (err, result) {
              if (err) return reject(err);
              resolve(result);
            });
          });
        });

        return function (_x, _x2) {
          return _ref.apply(this, arguments);
        };
      })()
    });

    Object.defineProperty(queue, 'deljob', {
      get: () => (() => {
        var _ref2 = (0, _asyncToGenerator3.default)(function* (job) {
          const pattern = job + '$*';
          const self = this;
          // redis.zscan key cursor match `5b4d4dccaabd71111111111c$*`
          const jobIds = yield getAllJobsById.call(this, pattern);
          jobIds.push(job);
          return new _promise2.default(function (resolve, reject) {
            originDelFn.call(self, jobIds)(function (err, result) {
              if (err) return reject(err);
              resolve(result);
            });
          });
        });

        return function (_x3) {
          return _ref2.apply(this, arguments);
        };
      })()
    });

    Object.defineProperty(queue, 'getjobs', {
      get: () => (() => {
        var _ref3 = (0, _asyncToGenerator3.default)(function* (scanActive) {
          const self = this;
          const data = yield new _promise2.default(function (resolve, reject) {
            originGetjobsFn.call(self, scanActive)(function (err, result) {
              if (err) return reject(err);
              resolve(result);
            });
          });
          data.jobs = data.jobs.map(function (job) {
            // job: '5b4d4dccaabd71111111111c$0111111111114349a338f16ef715fcd5'
            // id: '5b4d4dccaabd71111111111c'
            job.id = job.job.split('$')[0];
            return job;
          });
          return data;
        });

        return function (_x4) {
          return _ref3.apply(this, arguments);
        };
      })()
    });

    return queue;
  }
}

function attachUUID(str) {
  if (str.indexOf('$') > 0) throw new TypeError(`${String(str)} should not contain retain word: $`);
  return str + '$' + uuidv4().replace(/-/g, '');
}

function filer(dataArray) {
  let rst = [];
  for (let i = 0, l = dataArray.length; i < l; i += 2) {
    rst.push(dataArray[i]);
  }
  return rst;
}

module.exports = TQueue;