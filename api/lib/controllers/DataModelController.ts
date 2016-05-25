import RepositoryController from './RepositoryController';
import ActionModel from '../decorators/ActionModel';
import ActionAuth from '../decorators/ActionAuthorization';
import CtrlAuth from '../decorators/ControllerAuthorization';
import DataModelRepository from '../repositories/DataModelRepository';
import ControllerContext from './ControllerContext';
import * as q from 'q';
import httpErr from '../routing/HttpError';
import * as actionResult from '../routing/ActionResult';
import ModelDocument from '../viewmodels/ModelDocument';

@CtrlAuth(['modeler'])
export default class DataModelController extends RepositoryController<DataModelRepository> {

    constructor(){
        super(DataModelRepository, ModelDocument);
    }

    public post($model: ModelDocument): q.Promise<any> {
        return this.repo.createType($model);
    }

    public put($id, $model: ModelDocument): q.Promise<any> {
        return this.repo.editType($id, $model);
    }

    public delete($id): q.Promise<any>{
        return this.repo.deleteType($id);
    }

    public tree(): q.Promise<any> {
        return this.repo.getDataModelTree()
        .then(tree => {
            delete tree.root.__documents;
            return tree;
        })
    }
}
