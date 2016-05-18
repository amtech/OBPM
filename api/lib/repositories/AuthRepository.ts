import Repository from './Repository';
import * as q from 'q';
import db, {Database} from '../db';
import httpErr from '../routing/HttpError';
import NewUser from '../viewmodels/NewUser';
import UpdateUser from '../viewmodels/UpdateUser';
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

    /**
     * Generates a hash from a given password which can be securly saved in
     * the database.
     *
     * @method generateHash
     *
     * @param {string} password The password string to hash.
     *
     * @returns {q.Promise<any>} Promise resolving the hash.
     */
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

    /**
     * Verifies a password against a given hash.
     *
     * @method verifyPassword
     *
     * @param {string} clientPW The provided clear text password.
     * @param {string} userPW The hash to compare the password with.
     *
     * @returns {q.Promise<boolean>}
     */
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

    public updateUser(user: UpdateUser): q.Promise<any> {
        return this.getUser(user._key, true)
        .then(user => {
            if(!user) throw httpErr.execution('Could not find user.');
            return user;
        })
        .then(user => {
            return this.patchModel(user._key, user);
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

    /**
     * Returns a user object with the given DB key.
     * All attributes are returned except the password attribute.
     *
     * @method getUser
     *
     * @param {string} key The kex to look for.
     *
     * @returns {q.Promise<any>}
     */
    public getUser(key: string, includePassword?: boolean): q.Promise<any> {
        return this.db.single(`
            for user in User
            filter user._key == '${key}'
            return user
        `)
        .then(user => {
            if(user && !includePassword) {
                delete user.password;
            }
            return user;
        });
    }

    /**
     * Returns a client from the database used by the auth-model.
     *
     * @method getClient
     *
     * @param {string} clientId Client ID to look for.
     * @param {string} clientSecret Client secret to look for.
     *
     * @returns {q.Promise<any>}
     */
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
        return this.db.single(`
            for t in AccessToken
            filter t.clientId == '${clientId}' && t.userId == '${user._key}'
            return t
        `).then(token => {
            var ps = [];
            if (token) ps.push(toQ(this.db.collection('AccessToken').remove(token._key)));
            ps.push(toQ(this.db.collection('AccessToken').save({
                accessToken, clientId, expires, userId: user._key
            })));

            return q.all(ps);
        });
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

    /**
     * Updates the password of a user. Can only be executed if the currently
     * authenticated user is the provided user.
     *
     * @method updatePassword
     *
     * @param {User} currentUser The currently authenticated user instance.
     * @param {string} userName The username of the user to change the password.
     * @param {string} oldPassword The original password of the user.
     * @param {string} newPassword The new password of the usder.
     *
     * @returns {Promise<any>}
     */
    public updatePassword(currentUser, userName, oldPassword, newPassword) {
        if(currentUser.userName !== userName) {
            throw httpErr.auth('Invalid username or bad password');
        }

        return this.verifyUser(userName, oldPassword)
        .then(() => this.generateHash(newPassword))
        .then(hash => {
            var uUser = extend(true, {}, currentUser);
            uUser.password = hash;
            return this.updateModel(uUser._key, uUser);
        });
    }

    private static _cachedRepo: q.Promise<AuthRespository>;

    /**
     * Returns a promise resolving a cached instance of AuthRepository.
     *
     * @method getRepo
     *
     * @returns {q.Promise<AuthRespository>}
     */
    public static getRepo(): q.Promise<AuthRespository> {
        return this._cachedRepo || (this._cachedRepo = db('obpm_users').then(database => {
            return new AuthRespository(database);
        }));
    }
}
