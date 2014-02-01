App = Ember.Application.create();


//.. model .................................................

Message = Ember.Object.extend({
    headers: [],
    body: ''
});

Response = Message.extend({
    code: null,
    xhr: null
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

    selected: null,

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
                error: function(xhr) {
                    call.set('response.body',xhr.responseText);
                },
                complete: function(xhr, status) {
                    call.set('response.code',xhr.status);
                    call.set('response.xhr',xhr);
                    call.set('response.headers',Helper.parseHeaders(xhr.getAllResponseHeaders()));
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
    }
});


//.. helpers ................................................

Helper = {
    parseHeaders: function(string) {
        var headers = [], ha = string.split("\n");
        ha.forEach(function (h) {
            if (!h || h.trim() == "") return;
            var hp = { name: h.split(':',1)[0], value: h.substr(h.indexOf(':')+1).trim() };
            headers.push(hp);
        });
        return headers;
    }
}
