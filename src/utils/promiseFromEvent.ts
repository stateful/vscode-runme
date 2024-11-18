import { Disposable, Event, EventEmitter } from 'vscode'

// Interface declaration for a PromiseAdapter
export interface PromiseAdapter<T, U> {
  // Function signature of the PromiseAdapter
  (
    // Input value of type T that the adapter function will process
    value: T,
    // Function to resolve the promise with a value of type U or a promise that resolves to type U
    resolve: (value: U | PromiseLike<U>) => void,
    // Function to reject the promise with a reason of any type
    reject: (reason: any) => void,
  ): any // The function can return a value of any type
}

const passthrough = (value: any, resolve: (value?: any) => void) => resolve(value)

/**
 * Return a promise that resolves with the next emitted event, or with some future
 * event as decided by an adapter.
 *
 * If specified, the adapter is a function that will be called with
 * `(event, resolve, reject)`. It will be called once per event until it resolves or
 * rejects.
 *
 * The default adapter is the passthrough function `(value, resolve) => resolve(value)`.
 *
 * @param event the event
 * @param adapter controls resolution of the returned promise
 * @returns a promise that resolves or rejects as specified by the adapter
 */
export function promiseFromEvent<T, U>(
  event: Event<T>,
  adapter: PromiseAdapter<T, U> = passthrough,
): { promise: Promise<U>; cancel: EventEmitter<void> } {
  let subscription: Disposable
  let cancel = new EventEmitter<void>()

  // Return an object containing a promise and a cancel EventEmitter
  return {
    // Creating a new Promise
    promise: new Promise<U>((resolve, reject) => {
      // Listening for the cancel event and rejecting the promise with 'Cancelled' when it occurs
      cancel.event((_) => reject('Cancelled'))
      // Subscribing to the event
      subscription = event((value: T) => {
        try {
          // Resolving the promise with the result of the adapter function
          Promise.resolve(adapter(value, resolve, reject)).catch(reject)
        } catch (error) {
          // Rejecting the promise if an error occurs during execution
          reject(error)
        }
      })
    }).then(
      // Disposing the subscription and returning the result when the promise resolves
      (result: U) => {
        subscription.dispose()
        return result
      },
      // Disposing the subscription and re-throwing the error when the promise rejects
      (error) => {
        subscription.dispose()
        throw error
      },
    ),
    // Returning the cancel EventEmitter
    cancel,
  }
}
