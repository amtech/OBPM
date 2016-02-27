import * as express from 'express';

export default class ControllerContext{
    private _req: express.Request;
    private _res: express.Response;

    get request(): express.Request{
        return this._req;
    }

    get response(): express.Response{
        return this._res;
    }

    constructor(req: express.Request, res: express.Response){
        this._req = req;
        this._res = res;
    }
}