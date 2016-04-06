import Repository from './Repository';
import db, {Database} from '../db';
import * as q from 'q';

export default class CaseRespository extends Repository {

    protected get modelType(){
        return 'Document';
    }

    constructor(protected db: Database){
        super(db);
    }

    /*getDocuments(caseId: number, filter): q.Promise<any>{
        this.db.graph('Documents').traversal();
    }*/
}
