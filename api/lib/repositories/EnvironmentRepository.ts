import db, {Database} from '../db'
import Repository from './Repository';
import * as q from 'q';

export default class EnvironmentRepository extends Repository {
    constructor(db: Database) {
        super(db);
    }

    protected get modelType(){
        return '';
    }

    /**
     * Deletes the whole current process by dropping its database.
     *
     * @method deleteProcess
     *
     * @returns {q.Promise<any>} [description]
     */
    deleteProcess(): q.Promise<any> {
        return this.db.drop();
    }
}
