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
}
