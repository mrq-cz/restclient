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
    request: Message.create(),
    response: Response.create(),

    send: function(callback) {
        var self = this;
        $.ajax({
            url: self.url,
            type: self.method,
            data: self.request.body,
            beforeSend: function(xhr) {
                if (self.request.headers) {
                    self.request.headers.toArray().forEach(function(h) {
                        xhr.setRequestHeader(h.name, h.value);
                    });
                }
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
                self.set('response.headers',Headers.parseString(xhr.getAllResponseHeaders()));
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
            this.set('headers.content',Headers.clone(call.request.headers));
        },

        remove: function(call) {
            if (this.selected == call) this.set('selected', null);
            History.removeObject(call);
            History.saveStorage();
        },

        call: function(again) {
            this.set('headers.content',Headers.prepare(this.headers));
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
            this.setProperties({url: '', method: 'GET', body: '' });
            this.set('headers.content',[]);
            this.set('selected', null);
        },

        addHeader : function () {
            this.headers.addObject({name: '', value: ''});
        },

        removeHeader: function(header) {
            this.headers.removeObject(header);
        },

        saveSettings: function() {
            History.restore(this.data);
            History.saveStorage();
            if (this.blueprint && this.blueprint.trim().length > 0) {
                var ast, err;
                try {
                    ast = JSON.parse(this.blueprint);
                } catch (e) {
                    err = e;
                }
                if (err) {
                    Apiary.parseBlueprint(this.blueprint);
                } else {
                    Apiary.parseAst(ast);
                }
            }
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
        if (History.get('length') == 0) {
            var astUrl = Helpers.queryParam('ast');
            if (astUrl) Apiary.parseAstFromUrl(astUrl);
        }
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

Helpers = {
    parseUrl: function(url) {
        var a = document.createElement('a');
        a.href = url;
        return a;
    },
    queryParam: function(key) {
        key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, "\\$&"); // escape RegEx control chars
        var match = location.search.match(new RegExp("[?&]" + key + "=([^&]+)(&|$)"));
        return match && decodeURIComponent(match[1].replace(/\+/g, " "));
    }
}

Headers = {

    plugins: {},

    parse : function(object) {
        var headers = [];
        if (object) {
            $.each(object, function(index, value) {
                headers.push({ name: index, value: value.value });
            });
        }
        return headers;
    },
    parseString: function(string) {
        var headers = [], ha = string.split('\n');
        ha.forEach(function (h) {
            if (!h || h.trim() == '') return;
            var hp = { name: h.split(':',1)[0], value: h.substr(h.indexOf(':')+1).trim() };
            headers.push(hp);
        });
        return headers;
    },
    clone: function(headers) {
        var hs = [];
        if (headers) {
            headers.forEach(function (h) {
                hs.push({name: h.name, value: h.value})
            });
        }
        return hs;
    },
    prepare: function(headers) {
        var plugin, hs = []
        Headers.clone(headers).forEach(function (h) {
            if (typeof(plugin = Headers.plugins[h.name]) == "function") {
                plugin(h, headers);
            }
            hs.push(h);
        }); 
        return hs; 
    }
};

Headers.plugins.Authorization = function(header, headers) {
    if (header.value.indexOf('Basic ') == 0 && header.value.indexOf(':') > 0) {
        header.value = 'Basic ' + btoa(header.value.substr(6));
    }
}

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
        var calls = [];
        ast.resourceGroups.forEach(function (g) {
            g.resources.forEach(function(r){
                r.actions.forEach(function (a) {
                    var req = {}, res = {}, code, e;
                    if (e = a.examples[0]) {
                        if (e.requests[0]) {
                            req = Message.create({
                                body: e.requests[0].body,
                                headers: Headers.parse(e.requests[0].headers)
                            });
                        }
                        if (e.responses[0]) {
                            res = Response.create({
                                code: parseInt(e.responses[0].name),
                                body: e.responses[0].body,
                                headers: Headers.parse(e.responses[0].headers)
                            });
                        }
                    }
                    var call = Call.create({
                            url: server + r.uriTemplate,
                            method: a.method,
                            request: req,
                            response: res
                    });
                    History.addObject(call);
                });
            });
        });
        History.saveStorage();
    },
    parseAstFromUrl: function(url) {
        var astCall = Call.create({ url: url });
        astCall.send(function(call) {
            var ast = JSON.parse(call.response.body);
            Apiary.lastAst = ast;
            if (ast) {
                Apiary.parseAst(ast);
            }
        });
    }
};

Ember.TextField.reopen({
    attributeBindings: ['list']
});

Array.prototype.clone = function() { return jQuery.extend(true, {}, this); };