
import Controller from './Controller';
import Repository from '../repositories/Repository';
import ControllerContext from './ControllerContext';
import IModel from '../models/IModel';
import * as q from 'q';
import db, {Database} from '../db';
import CtrlAuth from '../decorators/ControllerAuthorization';

export default class RepositoryController<T extends Repository> extends Controller{
    protected repo: T;
    protected repoType: new(database: Database) => T;
    protected db: Database;
    protected modelType: {new(): IModel};

    constructor(repoType: {new(database: Database): T}, modelType?: {new(): IModel}){
        super();
        this.repoType = repoType;
        this.modelType = modelType;
    }

    public init(context: ControllerContext): q.Promise<any>{
        return super.init(context).then(() => {
            return db(context.request.params['tid']).then(database => {
                this.repo = new this.repoType(database);
            });
        });
    }

    public getAll(): q.Promise<any> {
        return this.repo.getAllModels();
    }

    public get($id){
        return this.repo.getModel($id);
    }

    public put($id, $model) {
        return this.repo.updateModel($id, $model);
    }

    public patch($id, $model): q.Promise<any> {
        return this.repo.patchModel($id, $model);
    }

    public post($model): q.Promise<any> {
        return this.repo.createModel($model);
    }

    public delete($id): q.Promise<any> {
        return this.repo.removeModel($id);
    }
}
