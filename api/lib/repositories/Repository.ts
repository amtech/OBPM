import db from '../db';
import {Database} from '../db';

export default class Repository {
    protected db: Database;
    protected processId: string;

    protected get modelType(){
        return undefined;
    }

    constructor(processId: string){
        this.db = db(processId);
        this.processId = processId;
    }

    public getModel(id: string){
        return this.db.getModel(this.modelType, id);
    }
}
