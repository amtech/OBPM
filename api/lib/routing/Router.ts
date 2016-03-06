import ActionInvoker from './ActionInvoker';
import * as express from 'express';
import * as extend from 'extend';
import IController from '../controllers/IController';
import ControllerContext from '../controllers/ControllerContext';
import HttpError from './HttpError';

export interface IRouterOptions{
    rejectOnModelStateError?: boolean;
    rejectOn404?: boolean;
    controllerTypes: Array<{new(): IController}>;
}

export interface IRouteOptions{
    actionName?: string;
    controller?: string;
}

export default class Router{
    private _options: IRouterOptions;
    private _actionInvoker: ActionInvoker;

    public static defaultRouterOptions: IRouterOptions = {
        rejectOn404: true,
        controllerTypes: []
    };
    public static defaultRouteOptions: IRouteOptions = {
    };

    constructor(options?: IRouterOptions){
        this._options = extend({}, Router.defaultRouterOptions, (options || {}));
        this._actionInvoker = new ActionInvoker(this._options);
    }

    public handle(options?: IRouteOptions): express.RequestHandler{
        let routeOpts: IRouteOptions = extend({}, Router.defaultRouteOptions, (options || {}));

        return function (req: express.Request, res: express.Response, next: express.NextFunction) {
            this._actionInvoker.invoke(req, res, {
                controller: routeOpts.controller,
                actionName: routeOpts.actionName
            })
            .then(actionResult => {
                res.status(200).end(actionResult);
            }, err => {
                if(err instanceof HttpError && (<HttpError>err).is404 && !this._options.rejectOn404){
                    next();
                }else{
                    next(err);
                }
            });
        }.bind(this);
    }
}
