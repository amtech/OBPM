import getDB, {Database} from '../db';
import * as q from 'q';
import AuthRepository from '../repositories/AuthRepository';

let getRepo = (): q.Promise<AuthRepository> => {
    return AuthRepository.getRepo();
}

let handleDone = (promise, callback) => {
    promise.then(result => {
        callback(null, result);
    }, err => {
        callback(err);
    });
};

let model = {
    saveAccessToken: (accessToken, clientId, expires, user, done) => {
        handleDone(getRepo().then(repo => {
            return repo.saveAccessToken(accessToken, clientId, expires, user);
        }), done);
    },

    grantTypeAllowed: (clientId, grantType, done) => {
        done(null, true);
    },

    getUser: (username: string, password: string, done) => {
        handleDone(getRepo().then(repo => {
            return repo.verifyUser(username, password);
        }), done);
    },

    getClient: (id: string, secret: string, done) => {
        handleDone(getRepo().then(repo => {
            return repo.getClient(id, secret);
        }), done);
    },

    getAccessToken: (token: string, done) => {
        handleDone(getRepo().then(repo => {
            return repo.getAccessToken(token);
        }), done);
    }
};

export default model;
