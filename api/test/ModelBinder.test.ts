import 'mocha';
import ModelBinder from '../lib/routing/ModelBinder';
import * as joi from 'joi';
import httpErr from '../lib/routing/HttpError';
import * as binding from '../lib/decorators/Binder';
import ModelState from '../lib/routing/ModelState';
import * as q from'q';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';

chai.use(chaiAsPromised);
chai.use(sinonChai);

let expect = chai.expect,
    assert = chai.assert;

class TestClass{
    firstName: string;
    lastName: string;
    subProp: TestSubClass;

    constructor(){
        this.firstName = undefined;
        this.lastName = undefined;
        this.subProp = new TestSubClass();
    }

    getSchema(): joi.ObjectSchema{
        return joi.object().keys({
            firstName: joi.string().required(),
            lastName: joi.string().required(),
            subProp: joi.object()
        });
    }
}

class TestSubClass{
    street: string;
    zipCode: number;
    city: string;

    constructor(){
        this.street = undefined;
        this.zipCode = undefined;
        this.city = undefined;
    }

    getSchema(): joi.ObjectSchema{
        return joi.object().keys({
            street: joi.string().required(),
            zipCode: joi.number().required().min(1000).max(9999),
            city: joi.string().required()
        });
    }
}

class TestModelBinder extends ModelBinder{
    bind(instance: any, data: any, modelState?: ModelState): q.Promise<ModelState>{
        return super.bind(instance, data, modelState);
    }
}

class TestPropertyBinder extends ModelBinder{
    bindProperty(instance: any, propName: string, value: any): q.Promise<any> {
        return super.bindProperty(instance, propName, value);
    }
}

describe('ModelBinder', () => {
    let modelBinder: ModelBinder;
    let data = {
        firstName: 'Remo',
        lastName: 'Zumsteg',
        subProp: {
            street: 'blabla',
            zipCode: 9999,
            city: 'Zürich'
        }
    };
    let model: TestClass;

    beforeEach(() => {
        modelBinder = new ModelBinder();
        model = new TestClass();
    });

    describe('##bind', () => {
        it('binds the model', () => {
            return assert.eventually.propertyVal(modelBinder.bind(model, data), 'isValid', true);
        });
    });

    describe('when using binding decorators', function(){
        let modelBinder = new TestModelBinder(),
            propBinder = new TestPropertyBinder(),
            defBinder = new ModelBinder(),
            modelSpy = sinon.spy(modelBinder, 'bind'),
            propSpy = sinon.spy(propBinder, 'bindProperty');

        @binding.model(modelBinder)
        class TestClass2 extends TestClass{
            @binding.property(propBinder)
            lastName: string;
        }

        beforeEach(() => {
            modelSpy.reset();
            propSpy.reset();
        });

        it('Calls the specified model binder\'s bind method', function () {
            return defBinder.bind(new TestClass2(), data).then(() => {
                return expect(modelSpy).to.have.been.called;
            });
        });

        it('Calls the specified property binder\'s bindProperty method', function () {
            let inst = new TestClass2();
            return defBinder.bind(inst, data).then(() => {
                return expect(propSpy).to.have.been.calledWith(inst, 'lastName');
            });
        });
    });
});