import IController from './IController';
import ControllerContext from './ControllerContext';

/**
 * Default base controller class.
 */
export default class Controller implements IController{
    /**
     * Current controller context instance.
     */
    protected context: ControllerContext;

    /**
     * Initializes the controller.
     * @param {ControllerContext} context The current request's
     * controller context.
     */
    init(context: ControllerContext): void{
        this.context = context;
    }
}