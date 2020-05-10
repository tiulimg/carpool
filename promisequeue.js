var logservices = require("./logservices");

module.exports = {
    enqueue: enqueue,
};

function enqueue(promise) {
    Queue.enqueue(promise);
}

class Queue {
    static queue = [];
    static pendingPromise = false;
  
    static enqueue(promise) {
      return new Promise((resolve, reject) => {
          this.queue.push({
              promise,
              resolve,
              reject,
          });
          this.dequeue()
          .catch(rejection => {
            logservices.logRejection(rejection);
          });
      });
    }
  
  static dequeue() {
      if (this.workingOnPromise) {
        return false;
      }
      const item = this.queue.shift();
      if (!item) {
        return false;
      }
      try {
        this.workingOnPromise = true;
        item.promise()
          .then((value) => {
            this.workingOnPromise = false;
            item.resolve(value);
            this.dequeue();
          })
          .catch(err => {
            this.workingOnPromise = false;
            item.reject(err);
            this.dequeue();
          })
      } catch (err) {
        this.workingOnPromise = false;
        logservices.logRejection(err);
        item.reject(err);
        this.dequeue();
      }
      return true;
    }
  }