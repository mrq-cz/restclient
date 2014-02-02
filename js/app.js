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

Methods = Ember.ArrayController.create({
    content:['GET','POST','PUT','DELETE']
});
CommonHeaders = Ember.ArrayController.create({
    content:['Accept','Accept-Charset','Accept-Encoding','Accept-Language','Authorization','Content-Type']
});
History = Ember.ArrayController.create();

App.IndexController = Ember.Controller.extend({
    url: '',
    method: 'GET',
    body: '',
    headers: Ember.ArrayController.create({content:[]}),

    selected: null,

    actions : {
        select: function(call) {
            this.set('selected', call);
            this.set('url',call.url);
            this.set('method',call.method);
            this.set('body',call.request.body);
            this.set('headers.content',Helper.cloneHeaders(call.request.headers));
        },

        remove: function(call) {
            if (this.selected == call) this.set('selected', null);
            History.removeObject(call);
        },

        call: function() {
            var headers = this.headers.toArray();
            headers.removeArrayObserver();
            var call = Call.create(
                {
                    url: this.url,
                    method: this.method,
                    request: Message.create({
                        body: this.body,
                        headers: headers
                    }),
                    response: Response.create()
                }
            );
            call.get('request').set('body', this.body);
            History.addObject(call);
            this.send('select',call);
            $.ajax({
                url: this.url,
                type: this.method,
                beforeSend: function(xhr) { 
                    headers.toArray().forEach(function(h) {
                        xhr.setRequestHeader(h.name, h.value);    
                    });
                },
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
            this.setProperties({url: '', method: 'GET', body: '', })
            this.set('headers.content',[])
            this.set('selected', null);
        },

        addHeader : function () {
            this.headers.addObject({name: '', value: ''})
        },

        removeHeader: function(header) {
            this.headers.removeObject(header);
        }
    }
});

App.HeadersController = Ember.Controller.extend({
    templateName: 'headers',
    actions: {
    }
});


//.. view ..................................................

HeadersView = Ember.View.extend({
    templateName: 'headers'
});

ResponseView = Ember.View.extend({
    templateName: 'response',

    headers: false,

    actions: {
        toggle : function() {
            this.set('headers', !this.headers);
        },
        empty : function() {
            return this.get('controller.headers').toArray().size < 1;
        }   
    }
});

TextAreaView = Ember.TextArea.extend({
    didInsertElement: function() {
        $(this.get('element')).on('keydown',function(e) {
            var o=this;
            var kC = e.keyCode ? e.keyCode : e.charCode ? e.charCode : e.which;
            if (kC == 9 && !e.shiftKey && !e.ctrlKey && !e.altKey)
            {
                var oS = o.scrollTop;
                if (o.setSelectionRange)
                {
                    var sS = o.selectionStart;
                    var sE = o.selectionEnd;
                    o.value = o.value.substring(0, sS) + "\t" + o.value.substr(sE);
                    o.setSelectionRange(sS + 1, sS + 1);
                    o.focus();
                }
                else if (o.createTextRange)
                {
                    document.selection.createRange().text = "\t";
                    e.returnValue = false;
                }
                o.scrollTop = oS;
                if (e.preventDefault)
                {
                    e.preventDefault();
                }
                return false;
            }
            return true;
        });
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
    },
    cloneHeaders: function(headers) {
        var hs = [];
        headers.forEach(function (h) {
            hs.push({name: h.name, value: h.value})
        });
        return hs;
    }

};

Ember.TextField.reopen({
    attributeBindings: ['list']
});

Array.prototype.clone = function() { return jQuery.extend(true, {}, this); }