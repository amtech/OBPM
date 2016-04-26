import 'reflect-metadata';
import IModel from '../models/IModel';
import {ModelAccessor} from './ActionModel';

export default function ControllerAuthorization(groups: string[]){
    return function (target: Function): void {
        for (let prop of Object.getOwnPropertyNames(target.prototype)) {
            if(typeof target.prototype[prop] === 'function'){
                Reflect.defineMetadata('authorization', groups, target, prop);
            }
        }
    };
}
