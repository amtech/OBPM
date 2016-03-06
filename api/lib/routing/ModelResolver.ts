import 'reflect-metadata';
import IController from '../controllers/IController';
import {GenericModelAccessor} from '../decorators/ActionModel';
import ModelBinder from './ModelBinder';

export default class ModelResolver{

    /**
     * Resolves and returns a new instance of the requested model type
     * by the provided action method.
     *
     * @param controller The controller instance hosting the action.
     * @param methodName The name of the action.
     * @returns {any} a new model instance.
     */
    public resolve(controller: IController, actionName: string): any{
        let modelType = <GenericModelAccessor>Reflect.getMetadata('modelType', controller, actionName);
        if(!modelType){
            return null;
        }

        return modelType.getInstance();
    }
}