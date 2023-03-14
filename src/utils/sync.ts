/* Mutex provides mutex feature by building a promise chain.
  const m = new Mutex();
  await m.withLock(async () => {
    // critical section
  })

  https://github.com/golang/vscode-go/blob/fa820d45d7b9217e949c21ffd13268e20c7e0ee4/src/utils/mutex.ts#L8
*/
export class Mutex {
	private mutex = Promise.resolve()

	private lock(): PromiseLike<() => void> {
		// Based on https://spin.atomicobject.com/2018/09/10/javascript-concurrency/

		let x: (unlock: () => void) => void

		// add to the promise chain of this mutex.
		// When all the prior promises in the chain are resolved,
		// x, which will be the resolve callback of promise B,
		// will run and cause to unblock the waiter of promise B.
		this.mutex = this.mutex.then(() => {
			return new Promise(x) // promise A
		})

		return new Promise((resolve) => {
			// promise B
			x = resolve
		})
		// the returned Promise will resolve when all the previous
		// promises chained in this.mutex resolve.
	}

  public async withLock<T>(cb: () => Promise<T>|T): Promise<T> {
    const unlock = await this.lock()

    try {
      return await cb()
    } catch(e) {
      throw e
    } finally {
      unlock()
    }
  }
}
