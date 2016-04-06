import ControllerContext from './ControllerContext';
import * as q from 'q';

interface IController{
    init(context: ControllerContext): q.Promise<any>;
    context(): ControllerContext;
}

export default IController;
