import * as express from 'express';
import ModelState from '../routing/ModelState';

export default class ControllerContext{
    private _req: express.Request;
    private _res: express.Response;
    private _modelState: ModelState;

    get request(): express.Request{
        return this._req;
    }

    get response(): express.Response{
        return this._res;
    }

    get modelState(): ModelState{
        return this._modelState;
    }

    constructor(req: express.Request, res: express.Response){
        this._req = req;
        this._res = res;
        this._modelState = new ModelState();
    }
}