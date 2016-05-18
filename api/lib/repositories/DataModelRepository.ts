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

    public createType(doc: ModelDocument): q.Promise<any>{
        // check valid client data:
        if (doc.type !== 'Case') {
            var errors = [];
            if(!doc.parent) errors.push({message: 'Only type Case is allowed to have no parent.',
                type: 'any',
                path: 'parent'
            });
            if(!doc.property) errors.push({
                message: 'Only type Case is allowed to have no property.',
                type: 'any',
                path: 'property'
            });
            if(errors.length) throw httpErr.validation(errors);
        }

        // if type == Case: Check if a Case already exists:
        return (doc.type !== 'Case' ? q.fcall(() => null) : this.db.single(`
            for caseDoc in DocumentType
            filter caseDoc.type == 'Case'
            return caseDoc
        `))
        .then(caseDoc => {
            if(caseDoc) {
                throw httpErr.execution('Only one document of type Case is allowed.');
            }
        })
        // Type != Case: get parent doc:
        .then(() => {
            return (doc.type === 'Case' ? q.fcall(() => 1) : this.db.single(`
                for doc in DocumentType
                filter doc._key == '${doc.parent}'
                return doc
            `));
        })
        .then(parent => {
            if (!parent) {
                throw httpErr.validation([{ message: 'invalid parent ID',
                    type: 'any',
                    path: 'parent'
                }]);
            }
            // save new doc and return it together with parent:
            return toQ<any>(this.db.collection('DocumentType').save({type: doc.type}))
            .then((newDoc => {
                return {newDoc, parent};
            }));
        })
        // Save edge-doc to parent:
        .then(docs => {
            if(doc.type === 'Case') return docs.newDoc;

            return toQ(this.db.edgeCollection('hasModel').save(
                { max: doc.max, property: doc.property },
                docs.parent._id,
                docs.newDoc._id)
            ).then(docs.newDoc);
        });
    }

    private static _cachedRepo: q.Promise<DataModelRespository>;
    public static getRepo(database: string): q.Promise<DataModelRespository> {
        return this._cachedRepo || (this._cachedRepo = db(database).then(database => {
            return new DataModelRespository(database);
        }));
    }
}
