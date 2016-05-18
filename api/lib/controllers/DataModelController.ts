import RepositoryController from './RepositoryController';
import ActionModel from '../decorators/ActionModel';
import ActionAuth from '../decorators/ActionAuthorization';
import CtrlAuth from '../decorators/ControllerAuthorization';
import DataModelRepository from '../repositories/DataModelRepository';
import CaseRepository from '../repositories/CaseRepository';
import ControllerContext from './ControllerContext';
import * as q from 'q';
import httpErr from '../routing/HttpError';
import * as actionResult from '../routing/ActionResult';
import ModelDocument from '../viewmodels/ModelDocument';

@CtrlAuth(['modeler'])
export default class DataModelController extends RepositoryController<DataModelRepository> {

    private caseRepo: CaseRepository;

    constructor(){
        super(DataModelRepository, ModelDocument);
    }

    public init(context: ControllerContext): q.Promise<any>{
        return super.init(context).then(() => {
            this.caseRepo = new CaseRepository(this.repo.DB);
        });
    }

    public post($model: ModelDocument): q.Promise<any> {
        return this.repo.createType($model);
    }

    public tree(): q.Promise<any> {
        return this.caseRepo.getModelTree()
        .then(tree => {
            delete tree.root.__documents;
            return tree;
        })
    }
}
