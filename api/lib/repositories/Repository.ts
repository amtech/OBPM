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

    public get DB() {
        return this.db;
    }

    public getModel(key: any, throwIfNotExisting?: boolean): q.Promise<any>{
        let pModel = this.db.getModel(this.modelType, key);
        return !throwIfNotExisting ? pModel : pModel.then(m => {
            if(m) return m;
            throw httpErr.notFound(`No resource of type ${this.modelType} and key ${key} could be found.`);
        });
    }

    public updateModel(key: any, data:any): q.Promise<any> {
        return this.getModel(key, true).then(model => {
            this.db.collection(this.modelType).replace(model, data);
        });
    }

    public patchModel(key: any, data: any): q.Promise<any> {
        return this.getModel(key, true).then(model => {
            this.db.collection(this.modelType).update(model, data);
        });
    }

    public createModel(data: any): q.Promise<any> {
        return this.db.collection(this.modelType).save(data);
    }

    public removeModel(key: any): q.Promise<any> {
        return this.db.collection(this.modelType).remove(key);
    }

    public getAllModels(): q.Promise<any> {
        return this.db.all(`
            for m in ${this.modelType}
            return m
        `);
    }
}
