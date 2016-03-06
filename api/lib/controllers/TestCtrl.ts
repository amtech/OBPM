import ControllerModel from '../decorators/ControllerModel';
import ActionModel from '../decorators/ActionModel';
import Action from '../models/Action';
import Controller from './Controller';

@ControllerModel(Action)
export default class TestController extends Controller{

    public static myStaticMethod(){
    }

    @ActionModel(Action)
    public get($model: Action) {
        return 'hello world';
    }
}