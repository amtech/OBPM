import * as express from 'express';
import Router from './routing/Router';
import TestCtrl from './controllers/TestCtrl';
import HttpError from './routing/HttpError';

export default class RouterRegistrar{
    private _router: Router;
    constructor(public app: express.Express){
        this._router = new Router({
            controllerTypes: [TestCtrl],
            rejectOn404: false
        });
    }

    /**
     * Initializes all express request routes.
     */
    initRoutes(){
        console.log('route init');
        this.app.get('/:controller/:action?', this._router.handle());
        this.app.use((req, res, next) => {
            next(HttpError.notFound());
        });

        this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            let status = err instanceof HttpError ? (<HttpError>err).httpCode : 500;
            res.status(status).end(err.toString());
        });
    }
}
