import Repository from './Repository';
import * as q from 'q';
import db, {Database} from '../db';
import httpErr from '../routing/HttpError';
import toQ from '../helpers/toq';

export default class RecordRespository extends Repository {

    protected get modelType(){
        return 'Record';
    }

    constructor(protected db: Database){
        super(db);
    }

    public createRecord(user, documentId, state, endState): q.Promise<any> {
        return null;
    }
}
