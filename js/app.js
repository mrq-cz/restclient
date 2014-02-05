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
    response: {},

    send: function(callback) {
        var self = this;
        $.ajax({
            url: self.url,
            type: self.method,
            data: self.request.body,
            beforeSend: function(xhr) {
                self.request.headers.toArray().forEach(function(h) {
                    xhr.setRequestHeader(h.name, h.value);
                });
            },
            success: function(data, status) {
                var body;
                if (typeof data == 'object') {
                    body = JSON.stringify(data, undefined, 2);
                } else {
                    body = data;
                }
                self.set('response.body',body);
            },
            error: function(xhr) {
                self.set('response.body',xhr.responseText);
            },
            complete: function(xhr, status) {
                self.set('response.code',xhr.status);
                self.set('response.xhr',xhr);
                self.set('response.headers',Helper.parseHeaders(xhr.getAllResponseHeaders()));
                callback(self);
            }
        });
    },

    serverPath: function() {
        var i, j, url = this.get('url');
        if ((i = url.indexOf('://')) > 0 && (j = url.substr(i+3).indexOf('/')) > 0 && (j += i+3)+1 < url.length) {
            return { server: url.substr(0,j), path: url.substr(j) };
        } else {
            return { server: null, path: url };
        }
    }.property('url'),

    methodColor: function() {
        return this.method === 'GET' ? 'label' : 'label success';
    }.property('method')
});

//.. controller ............................................

Methods = Ember.ArrayController.create({
    content:['GET','POST','PUT','DELETE']
});
CommonHeaders = Ember.ArrayController.create({
    content:['Accept','Accept-Charset','Accept-Encoding','Accept-Language','Authorization','Content-Type']
});
History = Ember.ArrayController.create({
    serialize : function (withoutResponse) {
        if(withoutResponse) {
            var data = JSON.parse(History.serialize());
            data.forEach(function(d) { d.response = null });
            return JSON.stringify(data);
        } else {
            return JSON.stringify(History.toArray());
        }
    },
    restore : function (serialized) {
        var data = JSON.parse(serialized);
        History.clear()
        data.forEach(function(h) {History.addObject(Call.create(h))});    
    },
    saveStorage : function() {
        localStorage.setItem('restclient-history', History.serialize())
    },
    restoreStorage : function() {
        var data = localStorage.getItem('restclient-history');
        if (data != null) {
            History.restore(data);
        }
    }
});

App.IndexController = Ember.Controller.extend({
    url: '',
    method: 'GET',
    body: '',
    headers: Ember.ArrayController.create({content:[]}),

    selected: null,
    data: null,
    blueprint: null,

    success: function() {
            return this.get('selected.response.code') < 300 ? 'label success' : 'label alert';    
    }.property('selected.response.code'),

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
            History.saveStorage();
        },

        call: function(again) {
            this.set('headers.content',Helper.prepareHeaders(this.headers));
            var headers = this.headers.toArray();
            headers.removeArrayObserver();
            var call = Call.create({
                url: this.url,
                method: this.method,
                request: Message.create({
                    body: this.body,
                    headers: headers
                }),
                response: Response.create()
            });
            if (again) {
                var i = History.indexOf(this.selected);
                History.replace(i,1,[call]);
            } else {
                History.addObject(call);
            }
            this.send('select',call);
            call.send(function() {
                History.saveStorage();
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
        },

        saveSettings: function() {
            History.restore(this.data);
            if (this.blueprint && this.blueprint.trim().length > 0) {
                var ast = JSON.parse(this.blueprint);
                if (ast) {
                    Apiary.parseAst(ast);
                } else {
                    Apiary.parseBlueprint(this.blueprint);
                }
            }
            History.saveStorage();
            this.send('closeModal');
        }
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

SettingsView = Ember.View.extend({
    templateName: 'settings',

    withoutResponse: false,

    didInsertElement: function() {
        this.set('controller.blueprint',null);
        this.set('controller.data',History.serialize());
    },

    actions: {
        toggleHistory: function() {
            this.set('withoutResponse',!this.withoutResponse);
            this.set('controller.data',History.serialize(this.withoutResponse));
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
                    o.value = o.value.substring(0, sS) + '\t' + o.value.substr(sE);
                    o.setSelectionRange(sS + 1, sS + 1);
                    o.focus();
                }
                else if (o.createTextRange)
                {
                    document.selection.createRange().text = '\t';
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

FocusTextField = Ember.TextField.extend({
    becomeFocused: function() {
        this.$().focus();
    }.on('didInsertElement')
});


//.. router ................................................

App.Router.map(function() {
});

App.IndexRoute = Ember.Route.extend({
    setupController: function(controller, model) {
        History.restoreStorage();
    },
    actions: {
        openModal: function(modalName) {
            return this.render(modalName, {
                into: 'application',
                outlet: 'modal'
            });
        },    
        closeModal: function() {
            return this.disconnectOutlet({
                outlet: 'modal',
                parentView: 'application'
            });
        }
    }   
});


//.. helpers ................................................

Helper = {
    parseHeaders: function(string) {
        var headers = [], ha = string.split('\n');
        ha.forEach(function (h) {
            if (!h || h.trim() == '') return;
            var hp = { name: h.split(':',1)[0], value: h.substr(h.indexOf(':')+1).trim() };
            headers.push(hp);
        });
        return headers;
    },
    cloneHeaders: function(headers) {
        var hs = [];
        if (headers) {
            headers.forEach(function (h) {
                hs.push({name: h.name, value: h.value})
            });
        }
        return hs;
    },
    prepareHeaders: function(headers) {
        var hs = []
        Helper.cloneHeaders(headers).forEach(function (h) {
            if (h.name == 'Authorization' && h.value.indexOf('Basic ') == 0
                    && h.value.indexOf(':') > 0) {
                h.value = 'Basic ' + btoa(h.value.substr(6));
            }
            hs.push(h);
        }); 
        return hs; 
    }
};

Apiary = {
    lastAst: null,

    parseBlueprint: function(blueprint) {
        var astCall = Call.create(
            {
                url: 'http://api.apiblueprint.org/blueprint/ast',
                method: 'POST',
                request: Message.create({
                    body: JSON.stringify({ blueprintCode: blueprint })
                }),
                response: Response.create()
            }
        );
        astCall.send(function(call) {
            var response = JSON.parse(call.response.body);
            Apiary.lastAst = response.ast;
            Apiary.parseAst(response.ast);
        });
    },
    parseAst: function(ast) {
        if (!ast.resourceGroups) return [];
        if (ast.metadata && ast.metadata.HOST) {
            var server = ast.metadata.HOST.value;
        }
        if (!server) server = '';
        var calls = []
        ast.resourceGroups.forEach(function (g) {
            g.resources.forEach(function(r){
                r.actions.forEach(function (a) {
                    var req, res, code, e;
                    if (e = a.examples[0]) {
                        if (e.requests[0]) {
                            req = e.requests[0].body;
                        }
                        if (e.responses[0]) {
                            code = parseInt(e.responses[0].name);
                            res = e.responses[0].body;
                        }
                    }
                    var call = Call.create({
                            url: server + r.uriTemplate,
                            method: a.method,
                            request: Message.create({
                                body: req
                            }),
                            response: Response.create({
                                code: code,
                                body: res
                            })
                    });
                    History.addObject(call);
                });
            });
        });
        History.saveStorage();
    }
};

Ember.TextField.reopen({
    attributeBindings: ['list']
});

Array.prototype.clone = function() { return jQuery.extend(true, {}, this); }