const STATE = {
  FULFILLED: 'fulfilled',
  PEDNDING: 'pending',
  REJECTED: 'rejected',
}

class MyPromise {
  #thenCallbacks = []
  #catchCallbacks = []
  #state = STATE.PEDNDING
  #value
  #onSuccessBind = this.#onSuccess.bind(this)
  #onFailBind = this.#onFail.bind(this)

  constructor(callback) {
    try {
      callback(this.#onSuccessBind, this.#onFailBind)
    } catch (error) {
      this.#onFail(error)
    }
  }

  #runCallbacks() {
    if (this.#state === STATE.FULFILLED) {
      this.#thenCallbacks.forEach((callback) => {
        callback(this.#value)
      })
      this.#thenCallbacks = []
    }

    if (this.#state === STATE.REJECTED) {
      this.#catchCallbacks.forEach((callback) => {
        callback(this.#value)
      })
      this.#catchCallbacks = []
    }
  }

  #onSuccess(value) {
    queueMicrotask(() => {
      if (this.#state !== STATE.PEDNDING) return

      if (value instanceof MyPromise) {
        value.then(this.#onSuccessBind, this.#onFailBind)
        return
      }

      this.#value = value
      this.#state = STATE.FULFILLED
      this.#runCallbacks()
    })
  }

  #onFail(value) {
    queueMicrotask(() => {
      if (this.#state !== STATE.PEDNDING) return

      if (value instanceof MyPromise) {
        value.then(this.#onSuccessBind, this.#onFailBind)
        return
      }

      if (this.#catchCallbacks.length === 0) {
        throw new UncaughtPromiseError(value)
      }

      this.#value = value
      this.#state = STATE.REJECTED
      this.#runCallbacks()
    })
  }

  then(thenCallback, catchCallback) {
    return new MyPromise((resolve, reject) => {
      this.#thenCallbacks.push((result) => {
        if (thenCallback == null) {
          resolve(result)
          return
        }
        try {
          resolve(thenCallback(result))
        } catch (error) {
          reject(error)
        }
      })

      this.#catchCallbacks.push((result) => {
        if (catchCallback == null) {
          reject(result)
          return
        }
        try {
          resolve(catchCallback(result))
        } catch (error) {
          reject(error)
        }
      })

      this.#runCallbacks()
    })
  }

  catch(callback) {
    return this.then(undefined, callback)
  }

  finally(callback) {
    return this.then(
      (result) => {
        callback()
        return result
      },
      (result) => {
        callback()
        throw result
      }
    )
  }

  static resolve(value) {
    return new Promise((resolve) => {
      resolve(value)
    })
  }

  static reject(value) {
    return new Promise((resolve, reject) => {
      reject(value)
    })
  }

  static all(promises) {
    const results = []
    let completedPromises = 0
    return new MyPromise((resolve, reject) => {
      for (let i = 0; i < promises.length; i++) {
        const promise = promises[i]
        promise
          .then((value) => {
            completedPromises++
            results[i] = value
            if (completedPromises === promises.length) {
              resolve(results)
            }
          })
          .catch(reject)
      }
    })
  }

  static allSettled(promises) {
    const results = []
    let completedPromises = 0
    return new MyPromise((resolve) => {
      for (let i = 0; i < promises.length; i++) {
        const promise = promises[i]
        promise
          .then((value) => {
            results[i] = { status: STATE.FULFILLED, value }
          })
          .catch((reason) => {
            results[i] = { status: STATE.REJECTED, reason }
          })
          .finally(() => {
            completedPromises++
            if (completedPromises === promises.length) {
              resolve(results)
            }
          })
      }
    })
  }

  static race(promises) {
    return new MyPromise((resolve, reject) => {
      promises.forEach((promise) => {
        promise.then(resolve).catch(reject)
      })
    })
  }

  static any(promises) {
    const errors = []
    let rejectedPromises = 0
    return new MyPromise((resolve, reject) => {
      for (let i = 0; i < promises.length; i++) {
        const promise = promises[i]
        promise.then(resolve).catch((value) => {
          rejectedPromises++
          errors[i] = value
          if (rejectedPromises === promises.length) {
            reject(new AggregateError(errors, 'All promises were rejected'))
          }
        })
      }
    })
  }
}

class UncaughtPromiseError extends Error {
  constructor(error) {
    super(error)

    this.stack = `(in promise) ${error.stack}`
  }
}

module.exports = MyPromise
