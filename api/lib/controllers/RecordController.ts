import RepositoryController from './RepositoryController';
import RecordRepository from '../repositories/RecordRepository';
import CtrlAuth from '../decorators/ControllerAuthorization';
import ActionAuth from '../decorators/ActionAuthorization';
import * as q from 'q';
import Execution from '../models/Execution';
import httpErr from '../routing/HttpError';
import ControllerContext from './ControllerContext';
import AuthRepository from '../repositories/AuthRepository';

@CtrlAuth(['admin'])
export default class RecordController extends RepositoryController<RecordRepository> {

    constructor() {
        super(RecordRepository);
    }

    post($model): q.Promise<any> {
        throw httpErr.notImplemented('Cannot manually create a document record.');
    }

    delete($id): q.Promise<any> {
        throw httpErr.notImplemented('Cannot delete a recorded document.');
    }

    put($id, $model): q.Promise<any> {
        throw httpErr.notImplemented('Cannot edit a recorded document.');
    }
}
