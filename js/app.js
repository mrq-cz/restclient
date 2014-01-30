App = Ember.Application.create();


//.. model .................................................

Message = Ember.Object.extend({
    headers: [],
    body: ''
});

Response = Message.extend({
    code: null
});

Call = Ember.Object.extend({
    method: 'GET',
    url: '',
    request: Message.create(),
    response: Response.create()
});



//.. controller ............................................

Methods = Ember.ArrayController.create({content:['GET','POST','DELETE','PUT']});
History = Ember.ArrayController.create();

App.IndexController = Ember.Controller.extend({
    url: '',
    method: 'GET',

    remove: function(call) {
        History.removeObject(call);
    },

    call: function() {
        History.addObject(Call.create({url:this.url,method:this.method}));
        this.url = '';
    }
});



//.. router ................................................

App.Router.map(function() {
    // put your routes here
});

App.IndexRoute = Ember.Route.extend({
    setupController: function(controller, model) {
        var call = Call.create();
        call.set('url','url0');
        History.addObjects([call, Call.create({url:'url1'}), Call.create().set('url','url2')]);
        //controller.set('history', this.model());
    },

    model: function() {
        return [];
    }
});
