import Repository from './Repository';
import {Database} from '../db';
import * as q from 'q';

export default class RecordRepository extends Repository {
    protected get modelType(){
        return 'Record';
    }

    /**
     * creats a new record based on the provided paremeters.
     *
     * @method createRecord
     *
     * @param {Action} user user instance who executed the change to record.
     * @param {User} action Action instance which was executed.
     * @param {object} docInfo Document manipulations infos.
     *
     * @returns {q.Promise<any>}
     */
    public createRecord(user, action, docInfo): q.Promise<any> {
        return this.createModel({
            date: new Date().toJSON(),
            user: {
                key: user._key,
                userName: user.userName
            },
            action: {
                key: action._key,
                name: action.name
            },
            document: {
                key: docInfo._key,
                type: docInfo.type,
                oldState: docInfo.oldState,
                newState: docInfo.newState,
                data: docInfo.data,
            }
        });
    }
}
