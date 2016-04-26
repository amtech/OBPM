import Repository from './Repository';
import * as q from 'q';
import db, {Database} from '../db';
import httpErr from '../routing/HttpError';
import NewUser from '../viewmodels/NewUser';
import * as extend from 'extend';
import toQ from '../helpers/toq';
import * as express from 'express';
var pwHandler = require('password-hash-and-salt');

export default class AuthRespository extends Repository {

    protected get modelType(){
        return 'User';
    }

    constructor(protected db: Database){
        super(db);
    }

    private generateHash(password: string): q.Promise<any> {
        let d = q.defer();
        pwHandler(password).hash((err, hash) => {
            if(err) {
                d.reject(err);
            } else {
                d.resolve(hash);
            }
        });

        return d.promise;
    }

    private verifyPassword(clientPW: string, userPW: string): q.Promise<boolean> {
        let d = q.defer<boolean>();
        pwHandler(clientPW).verifyAgainst(userPW, (err, ok) => {
            if(err) {
                d.reject(err);
            } else if (!ok) {
                d.reject(httpErr.execution('Invalid username or bad password'));
            } else {
                d.resolve();
            }
        });

        return d.promise;

    }

    /**
     * Creates a new user document.
     *
     * @method createUser
     *
     * @param {NewUser} user New user model
     *
     * @returns {q.Promise<any>}
     */
    public createUser(user: NewUser): q.Promise<any> {
        return this.db.single(`
            for user in User
            filter user.userName == '${user.userName}'
            return user
        `)
        .then(eu => {
            if (eu) {
                throw httpErr.execution('There is already a user with the same user name.');
            }
        })
        .then(() => {
            return this.generateHash(user.password)
        })
        .then(hash => {
            user.password = hash;
            return toQ(this.db.collection('User').save(user));
        });
    }

    /**
     * Verifies the provided user data and returns the DB instance if successful.
     *
     * @method verify
     *
     * @param {string} username user name to validate.
     * @param {string} password password to validate.
     *
     * @returns {q.Promise<any>}
     */
    public verifyUser(username: string, password: string): q.Promise<any> {
        return this.db.single(`
            for user in User
            filter user.userName == '${username}'
            return user
        `)
        .then(user => {
            if (!user) throw httpErr.execution('Invalid username or bad password');
            return this.verifyPassword(password, user.password).then(() => {
                return user;
            });
        }).then(user => {
            user.id = user.userName;
            return user;
        });
    }

    public getUser(key: string): q.Promise<any> {
        return this.db.single(`
            for user in User
            filter user._key == '${key}'
            return user
        `)
        .then(user => {
            if(user) {
                delete user.password;
            }
            return user;
        });
    }

    public getClient(clientId: string, clientSecret: string): q.Promise<any> {
        return this.db.single(`
            for client in Client
            filter client.id == '${clientId}' && client.secret == '${clientSecret}'
            return client
        `, true)
        .then(client => {
            return { clientId: client.id };
        });
    }

    public saveAccessToken(accessToken, clientId, expires, user): q.Promise<any> {
        let token = {
            accessToken, clientId, expires, userId: user._key
        }
        return toQ(this.db.collection('AccessToken').save(token));
    }

    public getAccessToken(token: string): q.Promise<any> {
        return this.db.single(`
            for token in AccessToken
            filter token.accessToken == '${token}'
            return token
        `, true);
    }

    public getCurrentUser(req: express.Request): q.Promise<any> {
        return this.getUser(req.user.id);
    }

    private static _cachedRepo: q.Promise<AuthRespository>;
    public static getRepo(): q.Promise<AuthRespository> {
        return this._cachedRepo || (this._cachedRepo = db('obpm_users').then(database => {
            return new AuthRespository(database);
        }));
    }
}
