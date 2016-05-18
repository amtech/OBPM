import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import * as supertest from 'supertest';
import db, {Database} from '../../lib/db';
var defaults = require('superagent-defaults');

chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.use(require('chai-things'));
let expect = chai.expect;

let api;

let config = {
    url: 'http://localhost:8090/',
    clientId: 'e2e-test-client',
    clientSecret: 'e2e-test-dg2343%.s79',
    user: 'e2e-test',
    password: 'e2e-spec-1287dgs&*h454_==',
    dbName: 'e2e-test'
};

let model = {
    types: {case: '', thesis: '', prof: '', student: '', upload: ''},
    actions: {
        createThesis: '',
        uploadFile: '',
        rejectUpload: '',
        acceptUpload: '',
        changeTitle: '',
        acceptTitle: '',
        assignStudent: ''
    }
}

/**
 * Conversta string to base64.
 *
 * @type {}
 */
let btoa = (str: string) => {
    return new Buffer(str).toString('base64');
}

/**
 * Handles the response of an API call.
 *
 * @param {function} done mocha done callback
 * @param {function} [handler] Optional response handler
 */
let handle = (done, handler?) => {
    return (err, res) => {
        if(err || res.body.err === false) {
            console.error(res.body);
            done(err || res.body);
        } else {
            if (handler) handler(res);
            done();
        }
    };
}

describe('create a process model', () => {

    before(done => {
        supertest(config.url)
        .post('oauth/token')
        .set('Authorization', 'Basic ' + btoa(`${config.clientId}:${config.clientSecret}`))
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .type('form')
        .send({grant_type: 'password'})
        .send({username: config.user})
        .send({password: config.password})
        .expect(200)
        .end((err, res) => {
            api = defaults(supertest(`${config.url}${config.dbName}`))
            .set('Authorization', 'Bearer ' + res.body.access_token);
            done(err);
        });
    });

    describe('create process data model', () => {
        it('creates a new case', done => {
            api.post('/datamodel').send({ type: 'Case' })
            .expect(200)
            .end(handle(done, res => {
                model.types.case = res.body._key;
            }));
        });

        it('creates type Thesis', done => {
            api.post('/datamodel').send({
                type: 'Thesis',
                parent: model.types.case,
                property: 'thesis',
                max: 1
            })
            .expect(200)
            .end(handle(done))
        });

        it('creates action createThesis', done => {
            api.post('/action').send({
                "createsNewCase": true,
                "name": "createThesis",
                "roles": ["teacher"],
                "documents": {
                    "newThesis": {
                        "type": "Thesis",
                        "path": "thesis",
                        "endState": "created",
                        "schema": {
                            "type": "object",
                            "properties": {
                                "title": {
                                    "type": "string"
                                },
                                "description": {
                                    "type": "string"
                                }
                            },
                            "required": ["title","description"]
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done, res => {
                model.actions.createThesis = res.body._key;
            }));
        });

        it('executes createThesis', done => {
            api.post('/action/execute').send({
                actionId: model.actions.createThesis,
                documents: {
                    newThesis: {
                        data: {
                            title: 'e2e Test Thesis',
                            description: 'This is a test document of type Thesis'
                        }
                    }
                }
            })
            .expect(200)
            .end(handle(done));
        });

        it('created a new case and thesis document', done => {
            api.get('/document')
            .expect(200)
            .end(handle(done, res => {
                expect(res.body.length).to.equal(2);
                let caseDoc = res.body.filter(d => d.type === 'Case')[0],
                    thesisDoc = res.body.filter(d => d.type === 'Thesis')[0];
                expect(caseDoc.state).equal('created')
                expect(thesisDoc.state).equal('created')
            }));
        });
    });

    after(done => {
        //delete test database after finishing all tests:
        api.delete('').expect(200).end(handle(done));
    });
});
