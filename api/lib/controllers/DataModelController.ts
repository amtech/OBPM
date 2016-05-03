import Controller from './Controller';
import ActionModel from '../decorators/ActionModel';
import ActionAuth from '../decorators/ActionAuthorization';
import CtrlAuth from '../decorators/ControllerAuthorization';
import DataModelRespository from '../repositories/DataModelRepository';
import ControllerContext from './ControllerContext';
import * as q from 'q';
import httpErr from '../routing/HttpError';
import * as actionResult from '../routing/ActionResult';

@CtrlAuth(['modeler'])
export default class DataModelController extends Controller {

    protected repo: DataModelRespository;

    constructor(){
        super();
    }

    public init(context: ControllerContext): q.Promise<any>{
        return super.init(context).then(() => {
            return DataModelRespository.getRepo(context.request.params['tid'])
            .then(repo => {
                this.repo = repo;
            });
        });
    }

    /*@ActionAuth([])
    public executables($user): q.Promise<any> {
        return this.repo.getExecutableActions($user);
    }

    public get($id): q.Promise<any> {
        return super.get($id);
    }

    public put($id, $model) {
        return super.put($id, $model);
    }

    public post($model): q.Promise<any> {
        return super.post($model);
    }

    public delete($id): q.Promise<any> {
        return super.delete($id);
    }*/
}
