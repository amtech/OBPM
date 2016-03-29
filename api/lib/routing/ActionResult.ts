
import httpErr from './HttpError';
import * as q from 'q';

export function res(promise: q.Promise<any>): q.Promise<any>{
    return promise.then(result => {
        if(result){
            return result;
        }
        throw httpErr.notFound('Could not find any resource for the given query.');
    });
}
