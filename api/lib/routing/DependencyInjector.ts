import * as q from 'q';
import IModel from '../models/IModel';
import ModelResolver from './ModelResolver';
import ModelBinder from './ModelBinder';
import * as express from 'express';
import IController from '../controllers/IController';
import ControllerContext from '../controllers/ControllerContext';
import ModelState from './ModelState';

class DependencyInjector{

    private static STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    private static ARGUMENT_NAMES = /([^\s,]+)/g;

    private action;
    private resolver: ModelResolver;
    private binder: ModelBinder;
    private _mapping: any;
    private req: express.Request;
    private res: express.Response;
    private ctrlContext: ControllerContext;

    constructor(private controller: IController,
                private actionName: string){
        this.action = controller[actionName];
        this.resolver = new ModelResolver();
        this.binder = new ModelBinder();
        this.ctrlContext = controller.context();
        this.req = this.ctrlContext.request;
        this.res = this.ctrlContext.response;
    }

    private getActionParameters(): string[]{
        let fnStr = this.action.toString().replace(DependencyInjector.STRIP_COMMENTS, ''),
            result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'))
                .match(DependencyInjector.ARGUMENT_NAMES);
        if(result === null) {
            result = [];
        }

        return result;
    }

    public getMapping(){
        if(!this._mapping){
            this._mapping = {
                $model: this.inject$Model,
                $req: this.inject$Req,
                $res: this.inject$Res,
            };
        }

        return this._mapping;
    }

    private inject$Model(): q.Promise<IModel>{
        let d = q.defer<IModel>(),
            model = this.resolver.resolve(this.controller, this.actionName);
        if(!model){
            d.reject(new Error('Cannot resolve model. No model type specified for invoked action.'));
        }

        this.binder.bind(model, this.req.body).then((modelState: ModelState) => {
            this.ctrlContext.modelState.add(modelState.errors);
            d.resolve(model);
        }, (err) => {
            d.reject(err);
        });

        return d.promise;
    }

    private inject$Req(): q.Promise<express.Request>{
        let d = q.defer<express.Request>();
        d.resolve(this.req);

        return d.promise;
    }

    private inject$Res(): q.Promise<express.Response>{
        let d = q.defer<express.Response>();
        d.resolve(this.res);

        return d.promise;
    }

    private inject$Null(): q.Promise<any>{
        let d = q.defer();
        d.resolve();

        return d.promise;
    }

    public getParameterValues(): q.Promise<any>{
        let params = this.getActionParameters(),
            valueProviders = this.getMapping(),
            promises = new Array<q.Promise<any>>();
        for(let param of params){
            let valueProvider = valueProviders[param] || this.inject$Null;
            promises.push(valueProvider.call(this));
        }

        return q.all(promises);

    }
}

export default DependencyInjector;