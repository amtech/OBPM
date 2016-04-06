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

    public getModel(id: number, throwIfNotExisting?: boolean){
        let pModel = this.db.getModel(this.modelType, id);
        return !throwIfNotExisting ? pModel : pModel.then(m => {
            if(m) return m;
            throw httpErr.execution(`No resource of type ${this.modelType} and id ${id} could be found.`);
        });
    }
}
