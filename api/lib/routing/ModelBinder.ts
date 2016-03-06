import * as joi from 'joi';
import * as q from 'q';
import ModelState from './ModelState';

/**
 * Binds provided data to an object instance.
 * If the instance provides a schema, the incoming data gets validated
 * before the binding
 */
export default class ModelBinder{

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

    /**
     * Tries to validate the given instance, if the model provides
     * a getSchema method. When validated, the returned promise resolves
     * a new data object which may contain transformed property values.
     *
     * @param instance The instance providing a schema.
     * @param data The data to validate.
     * @returns {Promise<any>}
     */
    private validateObject(instance, data, modelState?: ModelState): q.Promise<any>{
        data = data || {};
        let d = q.defer<any>(),
            _ms = modelState || new ModelState();
        if(typeof instance['getSchema'] === 'function') {
            let schema = instance['getSchema']();
            joi.validate(data, schema, {abortEarly: false}, (err, value) => {
                if(err != null){
                    _ms.add(err.details);
                }
                d.resolve(value);
            });
        }else {
            d.resolve(data);
        }

        return d.promise;
    }

    private bindObject(instance, data, modelState?: ModelState): q.Promise<any>{
        let _ms = modelState || new ModelState(),
            bindingPromises = new Array<q.Promise<any>>();
        for(let propName in instance){
            if(instance.hasOwnProperty(propName)){
                let prop = instance[propName];
                if(typeof prop === 'object') {
                    bindingPromises.push(this.bind(instance[propName], data[propName], _ms));
                }else if(typeof prop === 'function'){
                    continue;
                }else{
                    bindingPromises.push(this.bindProperty(instance, propName, data[propName]));
                }
            }
        }

        return q.all(bindingPromises);
    }

    private bindProperty(instance: any, propName: string, value: any): q.Promise<any>{
        let d = q.defer<any>();
        instance[propName] = value;
        d.resolve();

        return d.promise;
    }
}