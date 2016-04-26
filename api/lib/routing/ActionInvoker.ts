import * as express from 'express';
import ControllerContext from '../controllers/ControllerContext';
import IController from '../controllers/IController';
import * as q from 'q';
import DependencyInjector from './DependencyInjector';
import * as extend from 'extend';
import httpErr from './HttpError';
import 'reflect-metadata';
import AuthRepository from '../repositories/AuthRepository';

export interface IActionInvokerOptions{
    rejectOnModelStateError?: boolean;
    controllerTypes: Array<{new(): IController}>;
}

export interface IInvokeOptions{
    actionName?: string;r
    controllerName?: string;
}

export default class ActionInvoker{
    private _opts: IActionInvokerOptions;
    private _controllerTypes: any;

    private static _defInvokerOptions: IActionInvokerOptions = {
        rejectOnModelStateError: true,
        controllerTypes: []
    };

    constructor(options?: IActionInvokerOptions){
        this._opts = extend(true, {}, ActionInvoker._defInvokerOptions, (options || {}));
        this._controllerTypes = {};
        for(let t of this._opts.controllerTypes){
            this._controllerTypes[t.name.toLowerCase()] = t;
        }
    }

    /**
     * Resolves the controller type of the current request.
     * @returns {Function} the controller class function.
     * @private
     */
    private _resolveControllerType(ctrlName): Function{
        return this._controllerTypes[ctrlName.toLowerCase() + 'controller'];
    }

    /**
     * Returns an instance of the current controller type.
     * @returns {IController}
     * @private
     */
    private _resolveController(controllerParam: string, context: ControllerContext): IController{
        let ctrlFn = this._resolveControllerType(controllerParam);
        if(ctrlFn){
            let ctrl = this._createCtrlInstance(<{new(): IController}>ctrlFn);
            return ctrl;
        }

        return null;
    }

    /**
     * Creates an instance of the given controller type.
     * @param {Function} ctrlFn Controller function to invoke.
     * @returns {IController} a controller instance.
     * @private
     */
    private _createCtrlInstance(ctrlFn: {new(): IController}): IController{
        return new ctrlFn();
    }

    private processActionResult(result: any): q.Promise<any>{
        if(q.isPromise(result)){
            return result;
        }else{
            if(result instanceof Error){
                return q.fcall(() => { throw result });
            }else{
                return q.fcall(() => result);
            }
        }
    }

    private _resolveControllerName(req: express.Request, options: IInvokeOptions): string{
        return req.params['controller'] || options.controllerName;
    }

    private actionExists(ctrl: IController, actionName: string){
        return ctrl && typeof ctrl[actionName] === 'function';
    }

    public _resolveActionName(req: express.Request, options: IInvokeOptions): string {
        if (options.actionName) {
            return options.actionName;
        }
        if (req.params['action']) {
            return req.params['action'];
        }
        let method = req.method.toLowerCase();
        if(method === 'get' && !req.params['id']){
            return 'getAll';
        }

        return method;
    }

    /**
     * Checks if
     *
     * @method actionIsExecutable
     *
     * @param {string[]} groups [description]
     *
     * @returns {[type]} [description]
     */
    private actionIsExecutable(req, groups: string[]): q.Promise<boolean> {
        return AuthRepository.getRepo()
        .then(repo => repo.getCurrentUser(req))
        .then(user => {
            if(!groups) return true;
            let roles = user && user.roles ? user.roles : [];
            for(let g of groups) {
                if (roles.indexOf(g) >= 0) {
                    return true;
                }
            }
            throw httpErr.auth('No permission for execution.');
        })
    }

    private getActionParams(ctrl, ctrlContext, actionName): q.Promise<any[]> {
        let injector = new DependencyInjector(ctrl, ctrlContext, actionName);
        return injector.getParameterValues();
    }

    private initController(ctrl, ctrlContext): q.Promise<any> {
        return ctrl.init(ctrlContext);
    }

    private invokeAction(ctrl, actionName, params): q.Promise<any> {
        let actionResult = ctrl[actionName].apply(ctrl, params);
        return this.processActionResult(actionResult);
    }

    /**
     * Invokes the responsible action for the current request.
     *
     * @returns {Promise<any>}
     */
    public invoke(req: express.Request, res: express.Response, options?: IInvokeOptions): q.Promise<any> {
        let _opts = options || {},
            _ctrlContext = new ControllerContext(req, res),
            _actionName = this._resolveActionName(req, options),
            _controllerName = this._resolveControllerName(req, options),
            ctrl = this._resolveController(_controllerName, _ctrlContext);

        if(!ctrl)
            throw httpErr.routeNotFound('The specified controller \'' + _controllerName + '\' could not be found.');

        if(!this.actionExists(ctrl, _actionName))
            throw httpErr.routeNotFound('The specified action \'' + _actionName + '\' could not be found.');

        let auth = Reflect.getMetadata('authorization', ctrl, _actionName);

        return this.actionIsExecutable(req, auth)
        .then(() => this.initController(ctrl, _ctrlContext))
        .then(() => this.getActionParams(ctrl, _ctrlContext, _actionName))
        .then(params => {
            if(this._opts.rejectOnModelStateError && !_ctrlContext.modelState.isValid){
                // Do not execute the action:
                throw httpErr.validation(_ctrlContext.modelState.errors);
            } else {
                return this.invokeAction(ctrl, _actionName, params);
            }
        });
    }
}
