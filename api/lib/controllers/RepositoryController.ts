
import Controller from './Controller';
import Repository from '../repositories/Repository';
import ControllerContext from './ControllerContext';

export default class RepositoryController<T extends Repository> extends Controller{
    protected repo: T;
    protected repoType: new(processId: string) => T;

    constructor(repoType: {new(processId: string): T}){
        super();
        this.repoType = repoType;
    }

    public init(context: ControllerContext){
        super.init(context);
        this.repo = new this.repoType(this.precessId);
    }

    public get($id){
        return this.repo.getModel($id);
    }
}
