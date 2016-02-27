import 'reflect-metadata';
import IModel from '../models/IModel';
import {ModelAccessor} from './ActionModel';

export default function ControllerModel<T>(type: {new(): T}){
    return function (target: Function): void {
        for(let prop of target.prototype.getOwnPropertyNames()){
            if(typeof target.prototype[prop] === 'function'){
                Reflect.defineMetadata('modelType', new ModelAccessor<T>(type), target, prop);
            }
        }
    };
}