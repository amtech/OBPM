import Repository from './Repository';
import ExecutionContext from '../viewmodels/ExecutionContext';
import * as q from 'q';
import Action from '../models/Action';
import db, {Database} from '../db';
import * as joi from 'joi';
import httpErr from '../routing/HttpError';
import * as extend from 'extend';
import ActionExecutor from './ActionExecutor';
let enjoi = require('enjoi');
import toQ from '../helpers/toq';
import ModelDocument from '../viewmodels/ModelDocument';

export default class DataModelRespository extends Repository {

    protected get modelType(){
        return 'DocumentType';
    }

    constructor(protected db: Database){
        super(db);
    }

    public createDocument(doc: ModelDocument): q.Promise<any>{
        if(doc.type !== 'Case' && !doc.parent) {
            throw httpErr.validation([], 'Only Case document is allowed to have no parent.');
        }
        return (doc.type !== 'Case' ? q.fcall(() => null) : this.db.single(`
            for caseDoc in DocumentType
            filter caseDoc.type == 'Case'
            return caseDoc
        `))
        .then(caseDoc => {
            if(caseDoc) {
                throw httpErr.execution('Only one document of type Case is allowed.');
            }
            return this.db.collection('DocumentType').save({type: doc.type})
        })
        .then(newDoc => {
            if(doc.type === 'Case') return newDoc;

            return this.db.getModel('DocumentType', doc.parent)
            .then(parent => {
                if(!parent) {
                    throw httpErr.validation([], 'Invalid parent ID provided.');
                }
                return toQ(this.db.edgeCollection('hasModel').save({
                    max: doc.max,
                    fromId: parent._id,
                    toId: newDoc._id
                }));
            });
        });
    }

    private static _cachedRepo: q.Promise<DataModelRespository>;
    public static getRepo(database: string): q.Promise<DataModelRespository> {
        return this._cachedRepo || (this._cachedRepo = db(database).then(database => {
            return new DataModelRespository(database);
        }));
    }
}
