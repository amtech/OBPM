import 'reflect-metadata';
import IModel from '../models/IModel';
import {ModelAccessor} from './ActionModel';

export default function ControllerModel<T>(type: {new(): T}){
    return function (target: Function): void {
        let y = target;
        for (let prop of Object.getOwnPropertyNames(target.prototype)) {
            if(typeof target.prototype[prop] === 'function'){
                Reflect.defineMetadata('modelType', new ModelAccessor<T>(type), target, prop);
            }
        }
    };
}