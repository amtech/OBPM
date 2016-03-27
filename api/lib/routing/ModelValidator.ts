
import * as joi from 'joi';
import * as q from 'q';
import ModelState from './ModelState';

export interface IValidationResult{
    modelState: ModelState;
    value: any;
}

export default class ModelValidator {

    /**
     * Validates a model with the given data.
     *
     * @method validate
     *
     * @param {any} data model to validate
     * @param {joi.ObjectSchema} schema Schema for validation
     *
     * @returns {q.Promise<ModelState>}
     */
    public validate(data: any, schema: joi.ObjectSchema): q.Promise<IValidationResult> {
        let d = q.defer<IValidationResult>(),
            modelState = new ModelState();
        joi.validate(data, schema, {abortEarly: false}, (err, value) => {
            if(err) {
                modelState.add(err.details);
            }
            d.resolve({modelState, value});
        });

        return d.promise;
    }
}
