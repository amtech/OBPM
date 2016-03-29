import * as express from 'express';
import Router from './routing/Router';
import ActionController from './controllers/ActionController';
import HttpError from './routing/HttpError';

export default class RouterRegistrar{
    private _router: Router;
    constructor(public app: express.Express){
        this._router = new Router({
            controllerTypes: [ActionController],
            rejectOn404: true
        });
    }

    /**
     * Initializes all express request routes.
     */
    initRoutes(){
        // generic MVC/REST
        this.app.use('/:tid/:controller/:id(\\d+)', this._router.handle());
        this.app.use('/:tid/:controller/:action', this._router.handle());

        this.app.use((req, res, next) => {
            next(HttpError.notFound());
        });

        this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            let status = err instanceof HttpError ? (<HttpError>err).httpCode : 500;
            res.status(status).send({
                error: err.message,
                details: err.errors,
                stack: err.stack
            });
        });
    }
}
