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

/**
 * Allows invoking an action of a controller based on a routed express-request
 * and optional options to overwrite default invoker settings.
 */
export default class ActionInvoker{
    private _opts: IActionInvokerOptions;
    private _controllerTypes: any;

    /**
     * Static default invoker options.
     *
     * @type {IActionInvokerOptions}
     */
    private static _defInvokerOptions: IActionInvokerOptions = {
        rejectOnModelStateError: true,
        controllerTypes: []
    };

    constructor(options?: IActionInvokerOptions){
        this._opts = extend(true, {}, ActionInvoker._defInvokerOptions, (options || {}));
        this._loadControllerTypes(this._opts.controllerTypes);
    }

    /**
     * Loads an array of controller types into this instance's type cache.
     *
     * @method _loadControllerTypes
     *
     * @param {any[]} controllers The array of controller type to load.
     */
    private _loadControllerTypes(controllers: any[]): void {
        this._controllerTypes = this._controllerTypes || {};
        for(let t of controllers){
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

    /**
     * Handles the action result and returns a promise resolving the result.
     *
     * @method processActionResult
     *
     * @param {any} result The value returnes by an action.
     *
     * @returns {q.Promise<any>}
     */
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

    /**
     * Returns if the provided action exists on the current controller.
     *
     * @method actionExists
     *
     * @param {IController} ctrl Current controller instance.
     * @param {string} actionName Action name to look for.
     *
     * @returns {boolean}
     */
    private actionExists(ctrl: IController, actionName: string){
        return ctrl && typeof ctrl[actionName] === 'function';
    }

    /**
     * Resolves the action name to invoke based on the provided request and options.
     *
     * @method _resolveActionName
     *
     * @param {express.Request} req Current request.
     * @param {IInvokeOptions} options Options provided to the invoker.
     *
     * @returns {string}
     */
    private _resolveActionName(req: express.Request, options: IInvokeOptions): string {
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
     * Checks if the current user is allowed to execute the action based
     * on the user role authorizations.
     *
     * @method actionIsExecutable
     *
     * @param {string[]} groups The groups assigned to the action.
     *
     * @returns {boolean}
     */
    private actionIsExecutable(req, groups: string[]): q.Promise<boolean> {
        return AuthRepository.getRepo()
        .then(repo => repo.getCurrentUser(req))
        .then(user => {
            if(!groups || !groups.length) return true;
            let roles = user && user.roles ? user.roles : [];
            for(let g of groups) {
                if (roles.indexOf(g) >= 0) {
                    return true;
                }
            }
            throw httpErr.auth('No access to the requested route.');
        })
    }

    /**
     * Returns an array of parameters to provide to the calling action.
     *
     * @method getActionParams
     *
     * @param {Controller} ctrl Current controller context.
     * @param {ControllerContext} ctrlContext Current controller context.
     * @param {string} actionName The name of the calling action.
     *
     * @returns {q.Promise<any[]>}
     */
    private getActionParams(ctrl: IController, ctrlContext: ControllerContext, actionName: string): q.Promise<any[]> {
        let injector = new DependencyInjector(ctrl, ctrlContext, actionName);
        return injector.getParameterValues();
    }

    /**
     * Initializes the current controller. This method has to be called before
     * invoking an action.
     *
     * @method initController
     *
     * @param {Controller} ctrl current Controller instance
     * @param {ControllerContext} ctrlContext current controller context.
     *
     * @returns {q.Promise<any>}
     */
    private initController(ctrl: IController, ctrlContext: ControllerContext): q.Promise<any> {
        return ctrl.init(ctrlContext);
    }

    /**
     * Invokes the current action. This method may throw an error if the underlying
     * action fails to execute.
     *
     * @method invokeAction
     *
     * @param {Controller} ctrl current controller instance.
     * @param {string} actionName Current action name.
     * @param {Array<any>} params Action params to invoke with.
     *
     * @returns {q.Promise<any>} Promise resolving the action result.
     */
    private invokeAction(ctrl: IController, actionName: string, params: any[]): q.Promise<any> {
        let actionResult = ctrl[actionName].apply(ctrl, params);
        return this.processActionResult(actionResult);
    }

    /**
     * Invokes the responsible action for the current request.
     *
     * @method invoke
     *
     * @param {express.Request} req The current express HTTP request
     * @param {express.Response} res The current express HTTP Response
     * @param {IInvokeOptions} [options] Optional invoking options.
     *
     * @returns {q.Promise<any>} A promise resolving the action result.
     */
    public invoke(req: express.Request, res: express.Response, options?: IInvokeOptions): q.Promise<any> {
        // get basic values about the current request:
        let _opts = options || {},
            _ctrlContext = new ControllerContext(req, res),
            _actionName = this._resolveActionName(req, options),
            _controllerName = this._resolveControllerName(req, options),
            ctrl = this._resolveController(_controllerName, _ctrlContext);

        // throw if the requested controller does not exist.
        if(!ctrl)
            throw httpErr.routeNotFound('The specified controller \'' + _controllerName + '\' could not be found.');

        // throw if the requested action does not exist in the current controller:
        if(!this.actionExists(ctrl, _actionName))
            throw httpErr.routeNotFound('The specified action \'' + _actionName + '\' could not be found.');

        // Get any authorization information on the current action:
        let auth = Reflect.getMetadata('authorization', ctrl, _actionName);

        // Check authorization, initialize the controller and get the action
        // parameters from the dependency injector.
        // Additionally, check the model state and cancel the invoking if model state is Invalid
        // and rejectOnModelStateError is set to true:
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
