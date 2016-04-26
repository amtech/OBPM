import Repository from './Repository';
import db, {Database} from '../db';
import * as q from 'q';
import * as objectPath from 'object-path';

export default class CaseRespository extends Repository {

    protected get modelType(){
        return 'Document';
    }

    constructor(protected db: Database){
        super(db);
    }

    getCaseTree(caseKey: string): q.Promise<ObjectTree> {
        return this.getTree('documents', 'Document/' + caseKey);
    }

    getModelTree(): q.Promise<ObjectTree> {
        return this.db.single(`
            for dt in DocumentType
            filter dt.type == 'Case'
            return dt
        `)
        .then(rootType => {
            return this.getTree('documentTypes', rootType._id);
        });
    }

    private getTree(graph: string, docId: string): q.Promise<ObjectTree> {
        let documents = {},
            caseDocument,
            getDoc = (id: string): q.Promise<any> => {
                return documents[id] || (documents[id] =
                    this.db.getModelById(id).then(d => {
                        return documents[id] = d;
                    })
                );
            }
        return this.db.q(`
            FOR e IN GRAPH_EDGES('${graph}', '${docId}', {
                direction: 'outbound', includeData: true, maxDepth: 0
            })
            return e
        `)
        .then(result => {
            let promises = [];
            result._result.forEach(edge => {
                promises.push(getDoc(edge._from).then(doc => {
                    edge._from = doc;
                }));
                promises.push(getDoc(edge._to).then(doc => {
                    edge._to = doc;
                }));
            });
            return q.all(promises).then(() => {
                for(let edge of result._result) {
                    if((edge.max === void 0 || edge.max > 1) && graph === 'documents') {
                        edge._from[edge.property] = edge._from[edge.property] || [];
                        edge._from[edge.property].push(edge._to);
                    } else {
                        edge._from[edge.property] = edge._to;
                    }
                    edge._from[edge.property].__min = edge.min;
                    edge._from[edge.property].__max = edge.max;
                }

                for(let id in documents) {
                    if(documents[id].type === 'Case') {
                        caseDocument = documents[id];
                        break;
                    }
                }
                if (caseDocument) {
                    caseDocument.__documents = documents;
                    return new ObjectTree(caseDocument);
                }
            });
        });
    }
}

export class ObjectTree {
    constructor(public root) {}

    public get documents (): any {
        return this.root.__documents;
    }

    public getValue(path: string): any {
        return <any>objectPath.get(this.root, path);
    }

    public resolveVar(path: string): any {
        if (path.substring(0, 1) === '%') {
            return this.getValue(path.substring(1));
        }

        return path;
    }
}
