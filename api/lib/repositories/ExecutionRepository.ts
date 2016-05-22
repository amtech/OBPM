import Repository from './Repository';
import {Database} from '../db';
import * as q from 'q';
import Execution from '../models/Execution';
import ActionRepository from './ActionRespository';
import ActionExecutor from './ActionExecutor';
import Action from '../models/Action';

export default class ExecutionRepository extends Repository{
    protected get modelType(){
        return 'Execution';
    }

    protected actionRepo: ActionRepository;

    constructor(protected db: Database){
        super(db);
        this.actionRepo = new ActionRepository(this.db);
    }

    public createExecution(execution: Execution, user): q.Promise<any> {
        return this.actionRepo.getModel(execution.actionId, true).then((action: Action) => {
            let executer = new ActionExecutor(execution, action, user, this.db);
            return executer.execute();
        });
    }
}
