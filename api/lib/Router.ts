import * as express from 'express';
import Router from './routing/Router';

import ActionController from './controllers/ActionController';
import DocumentController from './controllers/DocumentController';
import UserController from './controllers/UserController';
import DataModelController from './controllers/DataModelController';
import EnvironmentController from './controllers/EnvironmentController';
import ExecutionController from './controllers/ExecutionController';
import RecordController from './controllers/RecordController';
import authModel from './helpers/auth-model';
import * as morgan from 'morgan';

import HttpError from './routing/HttpError';
let oauthServer = require('oauth2-server');

export default class RouterRegistrar{
    private _router: Router;
    constructor(public app: express.Express){
        this._router = new Router({
            controllerTypes: [
                ActionController,
                DocumentController,
                UserController,
                DataModelController,
                EnvironmentController,
                ExecutionController,
                RecordController
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

        //this.app.use(morgan('combined'));

        /**
		 * Authentication Routes
		 * All requests on these routes get handled by the oauth2-server module.
		 */
		// executes this.oauth.grant() for authentication requests:
        this.app.all('/oauth/token', this.oauth.grant());
		// gets executes for every incoming request regardless of its url or method.
		// validates the provided authentication information:
        this.app.use(this.oauth.authorise());


		/**
		 * REST Routes.
		 * All requests for these routes get handled by api/lib/routing/Router.ts.
		 */
        // Handle requests to [/user)] [/user/id] of any method.
		// Both routes use the controller 'UserController':
        this.app.use('/user/:id(\\d+)', this._router.handle({controller: 'user'}));
        this.app.use('/user/:action', this._router.handle({controller: 'user'}));
        this.app.use('/user$', this._router.handle({controller: 'user'}));

		// Handles request for requests to [/process_name].
		// Requests get forwarded to controller EnvironmentController:
        this.app.use('/:process$', this._router.handle({ controller: 'environment' }));

        // Handle all generic REST request to:
		// [/process_name/controller_name/id] => action = HTTP-method,
		// [/process_name/controller_name/action] and
		// [/process_name/controller_name/] => action = HTTP-method
        this.app.use('/:process/:controller/:id(\\d+)', this._router.handle());
        this.app.use('/:process/:controller/:action', this._router.handle());
        this.app.use('/:process/:controller$', this._router.handle());


		/**
		 * Error Handling Routes.
		 * These middlewares handle unhandled requests and previously errors:
		 */
		// Handles previously raised authentication errors:
        this.app.use(this.oauth.errorHandler());

		// Last middleware in stack. Handles all not previously handled requests by raising
		// an HTTP-404 error.
        this.app.use((req, res, next) => {
            next(HttpError.notFound('Could not find a matching route for the given request.'));
        });

		// Global error handler handling all possible previously raised errors:
        this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            let status = err instanceof HttpError ? (<HttpError>err).httpCode : 500;
            res.status(status).send({
                code: err.code,
                error: err.message,
                details: err.errors,
                stack: err.stack
            });
        });
    }
}
