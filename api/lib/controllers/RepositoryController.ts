
import Controller from './Controller';
import Repository from '../repositories/Repository';
import ControllerContext from './ControllerContext';
import * as q from 'q';
import db, {Database} from '../db';

export default class RepositoryController<T extends Repository> extends Controller{
    protected repo: T;
    protected repoType: new(database: Database) => T;
    protected db: Database;

    constructor(repoType: {new(database: Database): T}){
        super();
        this.repoType = repoType;
    }

    public init(context: ControllerContext): q.Promise<any>{
        return super.init(context).then(() => {
            return db(context.request.params['tid']).then(database => {
                this.repo = new this.repoType(database);
            });
        });
    }

    public get($id){
        return this.repo.getModel($id);
    }
}
