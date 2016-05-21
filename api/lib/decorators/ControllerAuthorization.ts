import 'reflect-metadata';
import IModel from '../models/IModel';
import {ModelAccessor} from './ActionModel';

export default function ControllerAuthorization(groups: string[]){
    return function (target: Function): void {
        for (let prop of Object.getOwnPropertyNames(target.prototype)) {
            if (typeof target.prototype[prop] === 'function'){
                let auth = Reflect.getMetadata('authorization', target.prototype, prop);
                if(auth && auth.__override) continue;
                let g = groups;
                if (target.prototype.hasOwnProperty(prop)) {
                    g['__override'] = true;
                }
                Reflect.defineMetadata('authorization', g, target.prototype, prop);
            }
        }
    };
}
