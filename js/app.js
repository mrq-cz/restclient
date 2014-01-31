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
    request: {},
    response: {}
});

//.. controller ............................................

Methods = Ember.ArrayController.create({content:['GET','POST','DELETE','PUT']});
History = Ember.ArrayController.create();

App.IndexController = Ember.Controller.extend({
    url: '',
    method: 'GET',

    body: '',

    selected: Call.create(),

    actions : {
        select: function(call) {
            this.set('selected', call);
            this.set('url',call.url);
            this.set('method',call.method);
            this.set('body',call.request.body);
        },

        remove: function(call) {
            if (this.selected == call) this.set('selected', null);
            History.removeObject(call);
        },

        call: function() {
            var call = Call.create(
                {
                    url: this.url,
                    method: this.method,
                    request: Message.create({
                        body: this.body
                    }),
                    response: Response.create()
                }
            );
            call.get('request').set('body', this.body);
            this.set('selected', call);
            History.addObject(call);
            $.ajax({
                url: this.url,
                type: this.method,
                success: function(data, status) {
                    var body;
                    if (typeof data == "object") {
                        body = JSON.stringify(data, undefined, 2);
                    } else {
                        body = data;
                    }
                    call.set('response.body',body);
                },
                complete: function(xhr, status) {
                    call.set('response.code',xhr.status);
                }

            });
        },

        clean: function() {
            this.setProperties({url: '', method: 'GET', body: ''})
        }
    }
});


//.. view ..................................................

CodeMirrorView = Ember.TextArea.extend({
    didInsertElement: function() {
        this.codeMirror = CodeMirror.fromTextArea(this.get('element'));
    }
});


//.. router ................................................

App.Router.map(function() {
});

App.IndexRoute = Ember.Route.extend({
    setupController: function(controller, model) {
        var call = Call.create();
        call.set('url','url0');
        History.addObjects([call, Call.create({url:'url1'}), Call.create().set('url','url2')]);
    }
});
