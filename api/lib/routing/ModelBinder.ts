import * as joi from 'joi';
import * as q from 'q';
import ModelState from './ModelState';
import 'reflect-metadata';
import ModelValidator from './ModelValidator';

/**
 * Binds provided data to an object instance.
 * If the instance provides a schema, the incoming data gets validated
 * before the binding
 */
export default class ModelBinder{

    private _validator: ModelValidator;

    constructor(){
        this._validator = new ModelValidator();
    }

    /**
     * Binds the provided data to the instance.
     * The returned promise gets resolved if no binding errors occured.
     * If rejected, the binding error is provided.
     *
     * @param instance The object instance to bind to.
     * @param data The data to bind.
     * @returns {Promise<any>}
     */
    public bind(instance: any, data: any, modelState?: ModelState): q.Promise<ModelState>{
        let objBinder = <ModelBinder>Reflect.getMetadata('binder', instance);
        if(objBinder && objBinder !== this){
            let binder = <ModelBinder>Reflect.getMetadata('binder', instance);
            return binder.bind(instance, data);
        }else{
            let d = q.defer<ModelState>(),
                _ms = modelState || new ModelState();
            this.validateObject(instance, data, _ms).then((dataObject) => {
                return this.bindObject(instance, dataObject, _ms);
            }).then(() => {
                d.resolve(_ms);
            }, err => {
                d.reject(err);
            }).done();

            return d.promise;
        }
    }

    /**
     * Tries to validate the given instance, if the model provides
     * a getSchema method. When validated, the returned promise resolves
     * a new data object which may contain transformed property values.
     *
     * @param instance The instance providing a schema.
     * @param data The data to validate.
     * @returns {Promise<any>}
     */
    protected validateObject(instance, data, modelState?: ModelState): q.Promise<any>{
        data = data || {};
        let d = q.defer<any>(),
            _ms = modelState || new ModelState();
        if(instance['getSchema'] === 'function') {
            this._validator.validate(data, instance['getSchema']).then((result) => {
                _ms.add(result.modelState.errors);
                d.resolve(result.value);
            });
        }else {
            d.resolve(data);
        }

        return d.promise;
    }

    protected bindObject(instance, data, modelState?: ModelState): q.Promise<any>{
        let _ms = modelState || new ModelState(),
            bindingPromises = new Array<q.Promise<any>>();
        for(let propName of Object.getOwnPropertyNames(instance)){
            let prop = instance[propName];
            if(typeof prop === 'object') {
                bindingPromises.push(this.bind(instance[propName], data[propName], _ms));
            }else if(typeof prop !== 'function'){
                bindingPromises.push(this.bindProperty(instance, propName, data[propName]));
            }
        }

        return q.all(bindingPromises);
    }

    protected bindProperty(instance: any, propName: string, value: any): q.Promise<any>{
        let propBinder = <ModelBinder>Reflect.getMetadata('binder', instance, propName);
        if(propBinder && propBinder !== this){
            return propBinder.bindProperty(instance, propName, value);
        }else{
            let d = q.defer<any>();
            instance[propName] = value;
            d.resolve();
            return d.promise;
        }
    }
}
