import * as q from 'q';

/**
 * Converts a JS Promise to a Q Promise.
 */
export default function toQ<T>(promise: Promise<T>): q.Promise<T> {
    let d = q.defer<T>();
    promise.then(result => {
        d.resolve(result);
    }, err => {
        d.reject(err);
    });

    return d.promise;
}
