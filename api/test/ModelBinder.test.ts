import 'mocha';
import ModelBinder from '../lib/routing/ModelBinder';
import Action from '../lib/models/Action';

describe('ModelBinder', () => {
    let modelBinder: ModelBinder;
    let data = {
        firstName: '$$$Remo',
        lastName: '$$$Zumsteg',
        address: {
            street: 'blabla',
            zipCode: 99999,
            city: 'Zürich'
        }
    };
    let model: Action;

    beforeEach(() => {
        modelBinder = new ModelBinder();
        model = new Action();
    });

    describe('##bind', () => {
        it('binds the model', (done) => {
            modelBinder.bind(model, data).then((modelState) => {
                if(modelState.isValid()) done();
                else done(modelState);
            }, (err) => {
                done(err);
            }).done();
        });
    });
});