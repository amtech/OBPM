import RepositoryController from './RepositoryController';
import ExecutionRepository from '../repositories/ExecutionRepository';
import CtrlAuth from '../decorators/ControllerAuthorization';
import ActionAuth from '../decorators/ActionAuthorization';
import * as q from 'q';
import Execution from '../models/Execution';
import httpErr from '../routing/HttpError';
import ControllerContext from './ControllerContext';
import AuthRepository from '../repositories/AuthRepository';

@CtrlAuth(['modeler'])
export default class ExecutionController extends RepositoryController<ExecutionRepository> {

    constructor() {
        super(ExecutionRepository, Execution);
    }

    protected authRepo: AuthRepository;

    public init(context: ControllerContext): q.Promise<any> {
        return super.init(context).then(() => {
            return AuthRepository.getRepo();
        })
        .then(repo => {
            this.authRepo = repo;
        });
    }

    /**
     * Executes the given execution request and archieves it in the DB.
     *
     * @method post
     *
     * @param {Execution} $model The execution context.
     *
     * @returns {q.Promise<any>}
     */
    @ActionAuth([])
    post($model: Execution): q.Promise<any> {
        // we have to get the user instance manually instead over $user injection,
        // because of Typescript's policy of method overriding:
        return this.authRepo.getUser(this.context().request.user.id).then(user => {
            return this.repo.createExecution($model, user);
        });
    }

    delete($id): q.Promise<any> {
        throw httpErr.notImplemented('Cannot delete a archieved execution.');
    }

    put($id, $model): q.Promise<any> {
        throw httpErr.notImplemented('Cannot edit a archieved execution.');
    }

    patch($id, $model): q.Promise<any> {
        throw httpErr.notImplemented('Cannot edit a archieved execution.');
    }

}
