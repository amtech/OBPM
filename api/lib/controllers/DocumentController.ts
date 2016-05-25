import RepositoryController from './RepositoryController';
import DocumentRepository from '../repositories/DocumentRepository';
import * as q from 'q';
import httpErr from '../routing/HttpError';
import CtrlAuth from '../decorators/ControllerAuthorization';

@CtrlAuth(['admin'])
export default class DocumentController extends RepositoryController<DocumentRepository> {
    constructor(){
        super(DocumentRepository);
    }

    public post($model): q.Promise<any> {
        throw httpErr.notImplemented('Cannot manually create a new document.');
    }

    public put($id, $model): q.Promise<any> {
        throw httpErr.notImplemented('Cannot manually edit an existing document.');
    }

    public delete($id): q.Promise<any> {
        throw httpErr.notImplemented('Cannot manually delete an existing document.');
    }
}
