import * as express from 'express';
import Router from './routing/Router';

import ActionController from './controllers/ActionController';
import CaseController from './controllers/CaseController';
import UserController from './controllers/UserController';
import authModel from './helpers/auth-model';

import HttpError from './routing/HttpError';
let oauthServer = require('oauth2-server');

export default class RouterRegistrar{
    private _router: Router;
    constructor(public app: express.Express){
        this._router = new Router({
            controllerTypes: [
                ActionController,
                CaseController,
                UserController
            ],
            rejectOn404: true
        });
        this.oauth = new oauthServer({
            grants: ['password'],
            accessTokenLifetime: 3600 * 24 * 365,
            model: authModel,
            debug: true
        });
    }

    private get oauth() {
        return this.app['oauth'];
    }

    private set oauth(server: any) {
        this.app['oauth'] = server;
    }

    /**
     * Initializes all express request routes.
     */
    initRoutes(){

        // auth
        this.app.all('/oauth/token', this.oauth.grant());
        this.app.use(this.oauth.authorise());

        // generic MVC/REST
        this.app.use('/:tid/:controller/:id(\\d+)', this._router.handle());
        this.app.use('/:tid/:controller/:action', this._router.handle());
        this.app.use('/:tid/:controller$', this._router.handle());

        this.app.use(this.oauth.errorHandler());

        this.app.use((req, res, next) => {
            next(HttpError.notFound('Could not find a matching route for the given request.'));
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
