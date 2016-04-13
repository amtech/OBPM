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

    getCaseTree(caseKey: string): q.Promise<any> {
        return this.getTree('documents', 'Document/' + caseKey);
    }

    getModelTree(): q.Promise<any> {
        return this.db.single(`
            for dt in DocumentType
            filter dt.type == 'Case'
            return td
        `)
        .then(rootType => {
            return this.getTree('documentTypes', rootType._id);
        });
    }

    private getTree(colName: string, docId: string): q.Promise<any> {
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
            FOR e IN GRAPH_EDGES('${colName}', '${docId}', {
                direction: 'outbound', includeData: true
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
                    if(edge.max === void 0 || edge.max > 1 && colName === 'document') {
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
                caseDocument.__documents = documents;

                return caseDocument;
            });
        });
    }

    /*getDocuments(caseKey: number, filters: any): q.Promise<any>{
        return this.db.q(`
            for v in graph_traversal(
                'documents', 'Document/${caseKey}', 'outbound',
                $
            )
            FOR v, e, p IN 1 OUTBOUND 'Case/${caseKey}' GRAPH 'Documents'
            FILTER vertex._key IN [${docKeys}]
            RETURN vertex
        `);
    }*/
}
