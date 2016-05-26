import Repository from './Repository';
import CaseRepository from './CaseRepository';
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

    protected caseRepo: CaseRepository;

    constructor(protected db: Database){
        super(db);
        this.caseRepo = new CaseRepository(db);
    }

    protected caseExists(): q.Promise<any> {
        return this.db.single(`
            for caseDoc in DocumentType
            filter caseDoc.type == 'Case'
            return caseDoc
        `).then(caseDoc => caseDoc != null);
    }

    protected validateModelDocument(model: ModelDocument) {
        // check valid client data:
        if (model.type !== 'Case') {
            var errors = [];
            if(!model.parent) errors.push({message: 'Only type Case is allowed to have no attribute parent.',
                type: 'any',
                path: 'parent'
            });
            if(!model.property) errors.push({
                message: 'Only type Case is allowed to have no attribute property.',
                type: 'any',
                path: 'property'
            });
            if(errors.length) throw httpErr.validation(errors);
        }
    }

    public createType(doc: ModelDocument): q.Promise<any>{
        this.validateModelDocument(doc);

        // if type == Case: Check if a Case already exists:
        return (doc.type !== 'Case' ? q.fcall(() => false) : this.caseExists())
        .then(caseDocExists => {
            if(caseDocExists) {
                throw httpErr.execution('Only one document of type Case is allowed.', 'dublicate_case');
            }
        })
        // Type !== Case: get parent doc:
        .then(() => {
            return (doc.type === 'Case' ? q.fcall(() => 1) : this.getModel(doc.parent));
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

            return this.createModelConnection(docs.parent, docs.newDoc, doc.property, doc.max)
            .then(() => {
                return docs.newDoc;
            });
        });
    }

    protected createModelConnection(parentDoc, childDoc, property, max) {
        return this.db.edgeCollection('hasModel').save(
            { max: max, property: property },
            parentDoc._id,
            childDoc._id)
    }

    public editType(key: any, data: ModelDocument) {
        this.validateModelDocument(data);

        if(data.type === 'Case') {
            throw httpErr.execution('Cannot edit an existing Case', 'edit_case');
        }

        return this.getModel(key, true)
        .then(model => {
            if(model.type === 'Case') {
                httpErr.execution('Cannot edit an existing Case', 'edit_case');
            }

            return this.getModel(data.parent).then((parent) => {
                if(!parent) {
                    throw httpErr.validation([{ message: 'invalid parent ID',
                        type: 'any',
                        path: 'parent'
                    }]);
                }

                model.type = data.type;
                return toQ<any>(this.db.collection('DocumentType').update(model, model))
                .then(() => {
                    return {model, parent};
                });
            });
        })
        .then(docs => {
            if(data.type === 'Case') return docs.model;
            return this.db.edgeCollection('hasModel').inEdges(docs.model._id)
            .then(conn => {
                let newConn = { property: data.property, max: data.max };
                return q.all([
                    this.db.edgeCollection('hasModel').remove(conn[0]),
                    this.createModelConnection(docs.parent, docs.model, data.property, data.max)
                ])
                .then(() => {
                    return docs.model;
                });
            });
        });
    }

    public deleteType(key: any) {
        return this.getModel(key, true)
        .then(model => {
            return this.db.edgeCollection('hasModel').outEdges(model)
            .then((conns) => {
                return this.db.edgeCollection('hasModel').inEdges(model)
                .then(parentConns => {
                    return { model, conns, parentConn: parentConns[0] };
                });
            });
        })
        .then(data => {
            return q.all(data.conns.map(c => {
                return this.deleteType(c._to.substring(c._to.indexOf('/') + 1));
            }))
            .then(() => {
                return this.db.edgeCollection('hasModel').remove(data.parentConn)
            })
            .then(() => {
                this.removeModel(key);
            });
        });
    }

    public getDataModelTree(): q.Promise<any> {
        return this.caseRepo.getModelTree();
    }

    private static _cachedRepo: q.Promise<DataModelRespository>;
    public static getRepo(database: string): q.Promise<DataModelRespository> {
        return this._cachedRepo || (this._cachedRepo = db(database).then(database => {
            return new DataModelRespository(database);
        }));
    }
}
