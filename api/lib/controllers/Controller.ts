import IController from './IController';
import ControllerContext from './ControllerContext';
import * as express from 'express';
import * as q from 'q';

/**
 * Default base controller class.
 */
export default class Controller implements IController{
    /**
     * Current controller context instance.
     */
    protected _context: ControllerContext;

    public context(): ControllerContext{
        return this._context;
    }

    /**
     * Initializes the controller.
     * @param {ControllerContext} context The current request's
     * controller context.
     */
    public init(context: ControllerContext): q.Promise<any> {
        return q.fcall(() => this._context = context);
    }
}
