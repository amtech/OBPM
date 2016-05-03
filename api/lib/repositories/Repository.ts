import db from '../db';
import {Database} from '../db';
import * as q from 'q';
import httpErr from '../routing/HttpError';

export default class Repository {

    protected get modelType(){
        return undefined;
    }

    constructor(protected db: Database){
    }

    public getModel(id: any, throwIfNotExisting?: boolean): q.Promise<any>{
        let pModel = this.db.getModel(this.modelType, id);
        return !throwIfNotExisting ? pModel : pModel.then(m => {
            if(m) return m;
            throw httpErr.execution(`No resource of type ${this.modelType} and id ${id} could be found.`);
        });
    }

    public updateModel(id: any, data:any): q.Promise<any> {
        return this.getModel(id, true).then(model => {
            this.db.collection(this.modelType).replace(model, data);
        });
    }

    public createModel(data: any): q.Promise<any> {
        return this.db.collection(this.modelType).save(data);
    }

    public removeModel(id: any): q.Promise<any> {
        return this.db.collection(this.modelType).remove(id);
    }
}
