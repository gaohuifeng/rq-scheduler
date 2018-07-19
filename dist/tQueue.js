'use strict';

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

let getAllJobsById = (() => {
  var _ref3 = (0, _asyncToGenerator3.default)(function* (pattern, cursor = 0) {
    const self = this;
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

  return function getAllJobsById(_x4) {
    return _ref3.apply(this, arguments);
  };
})();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const TimedQueue = require('timed-queue');
const uuidv4 = require('uuid/v4');
const thunk = require('thunks')();
class TQueue extends TimedQueue {
  constructor(options) {
    options = options || {};
    super(options);
  }

  tQueue(queueName, options) {
    const queue = super.queue(queueName, options);
    const originAddJobFn = queue.addjob;
    const originDelFn = queue.deljob;

    Object.defineProperty(queue, 'addjob', {
      get: () => (() => {
        var _ref = (0, _asyncToGenerator3.default)(function* (job, timing) {
          const self = this;
          return new _promise2.default(function (resolve, reject) {
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