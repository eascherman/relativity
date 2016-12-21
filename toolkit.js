
var listen = (name, callback) => ele => ele.addEventListener(name, ev => callback(ev));
var bind = (obj, prop) => listen('input', ev => obj[prop] = ev.target.value); 

re.on = (name, callback) => el => el.addEventListener(name, ev => callback(ev));
[   'click',
    'input', 'focus', 'blur', 
    'drag', 'dragstart', 'dragover', 'dragstop', 'drop', 
    'mousedown', 'mouseup', 'mouseenter', 'mouseleave'
].forEach(eventName => re.on[eventName] = callback => re.on(eventName, callback));

function input(func) {
    return listen('input', ev => func(ev.target.value, ev));
}

// establishes two way binding to the input element
// usage1: an object as arg1 and the name of a property in it as arg2
// usage2: a value getter as arg1 and a value setter as arg2
function bind2(arg1, arg2) {
    var bound = false;
    
    if (arg1 instanceof Function) {
        var get = arg1;
        var set = arg2;
        return function(ele) {
            if (document.activeElement != ele)
                ele.value = get();
            if (!bound)
                return input(val => set(val));
        }
    } else {
        var obj = arg1;
        var prop = arg2;
        return function(ele) {  
            if (document.activeElement != ele)
                ele.value = obj[prop];
            if (!bound)
                return input(val => obj[prop] = val);
        }
    }
}


var textInput = (arg1, arg2) => bundle
    `<input type="text" ${bind2(arg1, arg2)} />`;      

var numberInput = (arg1, arg2) => {
    var get, set;
    if (arg1 instanceof Function) {
        get = arg1;
        set = val => {
            var num = Number(val);
            if (!isNaN(num) && val != '')
                set(num);
        };
    } else {
        get = () => arg1[arg2];
        set = val => {
            var num = Number(val);
            if (!isNaN(num) && val != '')
                arg1[arg2] = num;
        };
    }
    
    return bundle
        `<input type="number" ${bind2(get, set)} />`;
};



/////////////////////////////////////////////
/////               Router
/////////////////////////////////////////////

function getHashRouter() {
    var hrefHolder = {};
    re(hrefHolder, 'href');
    hrefHolder.href = window.location.href;
    // todo: add location push state event handling
    
    var route = [];
    re(route, 'href', 
        () => hrefHolder.href,
        val => {
            window.location.href = val;
            hrefHolder.href = val;
        }
    );
    
    re(route, 'document', 
        () => 
            route.href.split('#')[0], 
        val => 
            route.href = val + (route.hash ? '#' + route.hash : '')
    );
    re(route, 'hash', 
        () => 
            route.href.split('#')[1], 
        val => 
            route.href = route.document + (val ? '#' + val : '')
    );
    re(route, 'querystring', 
        () => 
            !route.hash ? undefined : route.hash.split('?')[1], 
        val => 
            route.hash = route.path + (val ? '?' + val : '')
    );
    re(route, 'path', 
        () => 
            !route.hash ? undefined : route.hash.split('?')[0], 
        val => 
            route.hash = val + (route.querystring ? '?' + route.querystring : '')
    );
    /*R(route, 'path', () => {
        var h = window.location.hash;
        if (h.length > 0)
            return h.substring(1);
        else
            return null;
    }, val => {
        if (val)
            window.location.hash = '#' + val;
    });*/
        
    return route;
}


function LinkedList(arr) {
    this.onInsertCallbacks = [];
    this.onRemoveCallbacks = [];
    re(this, 'first');
    re(this, 'last');
    if (arr)
        arr.forEach(item => this.append(item));
}
LinkedList.prototype.prepend = function(value) {
    var lli = new LinkedListItem(value, this);
    lli.itemAfter = this.first;
    if (this.first)
        this.first.itemBefore = lli;
    this.first = lli;
    if (!this.last)
        this.last = lli;
    this.triggerOnInsert(lli);
    return lli;
};
LinkedList.prototype.append = function(value) {
    var lli = new LinkedListItem(value, this);
    lli.itemBefore = this.last;
    if (this.last)
        this.last.itemAfter = lli;
    this.last = lli;
    if (!this.first)
        this.first = lli;
    this.triggerOnInsert(lli);
    return lli;
};
LinkedList.prototype.toArray = function() {
    var out = [];
    var node = this.first;
    while (node) {
        out.push(node);
        node = node.itemAfter;
    }
    return out;
};
LinkedList.prototype.onInsert = function(callback) {
    this.onInsertCallbacks.push(callback);
}; 
LinkedList.prototype.triggerOnInsert = function(lli) {
    var cbs = this.onInsertCallbacks;
    //this.onInsertCallbacks = [];
    cbs.forEach(cb => cb(lli));
};
LinkedList.prototype.onRemove = function(callback) {
    this.onRemoveCallbacks.push(callback);
};
LinkedList.prototype.triggerOnRemove = function(lli) {
    var cbs = this.onRemoveCallbacks;
    //this.onRemoveCallbacks = [];
    cbs.forEach(cb => cb(lli));
}
LinkedList.prototype.selfCheck = function() {
    if (!this.first != !this.last)
        console.log('first-last issue');
    
    var count = 0;
    
    var lli = this.first;
    while (lli) {
        if (lli.itemAfter && lli.itemAfter.itemBefore !== lli)
            console.log('before after mismatch');
        count++;
        lli = lli.itemAfter;
    }
    
    lli = this.last;
    while(lli) {
        count--;
        lli = lli.itemBefore;
    }
    
    if (count != 0)
        console.log('first to last last to first miscount')
};


function LinkedListItem(value, list) {
    re(this, 'itemBefore');
    re(this, 'itemAfter');
    re(this, 'value');
    this.value = value;
    this.list = list;
}
LinkedListItem.prototype.insert = function(value) {
    var lli = new LinkedListItem(value, this.list);
    lli.itemBefore = this.itemBefore;
    if (this.itemBefore)
        this.itemBefore.itemAfter = lli;
    else
        this.list.first = lli;
    lli.itemAfter = this;
    this.itemBefore = lli;
    this.list.triggerOnInsert(lli);
    return lli;
};
LinkedListItem.prototype.insertAfter = function(value) {
    var lli = new LinkedListItem(vlaue, this.list);
    lli.itemAfter = this.itemAfter;
    if (this.itemAfter)
        this.itemAfter.itemBefore = lli;
    else
        this.list.last = lli;
    lli.itemBefore = this;
    this.itemAfter = lli;
    this.list.triggerOnInsert(lli);
    return lli;
};
LinkedListItem.prototype.remove = function() {
    this.itemPreviouslyAfter = this.itemAfter;
    this.itemPreviouslyBefore = this.itemBefore;
    
    if (this.itemBefore)
        this.itemBefore.itemAfter = this.itemAfter;
    else
        this.list.first = this.itemAfter;
        
    if (this.itemAfter)
        this.itemAfter.itemBefore = this.itemBefore;
    else
        this.list.last = this.itemBefore;
    
    this.itemBefore = null;
    this.itemAfter = null;
    
    this.list.triggerOnRemove(this);
};



function CallbackManager() {
    this.callbacks = [];
};
CallbackManager.prototype.add = function(func) {
    var out = {
        func: func,
        cancel: function() {
            out.func = null;
        }
    };
    this.callbacks.push(out);
    return out;
};
CallbackManager.prototype.trigger = function() {
    //var callbacks = this.callbacks;
    //this.callbacks = [];
    var args = arguments;
    this.callbacks.forEach(function(callback) {
        try {
            if (callback.func) 
                callback.func.apply(undefined, args);
        } catch (err) {
            console.log('Error in callback');
            console.log(err);
        }
    });
};

function SmartArray(arr) {
    this.values = [].concat(arr || []);
    Object.defineProperty(this, 'length', {
        enumerable: false,
        get: function() {
            return this.values.length;
        },
        set: function(n) {
            while (n > this.values.length) {
                this.remove(n);
                n--;
            }
            while (n < this.values.length) {
                this.push(undefined);
                n++;
            }
        }
    });

    this.onInserts = new CallbackManager();
    this.onRemoves = new CallbackManager();
};

SmartArray.prototype.onInsert = function(func) {
    this.onInserts.add(func);
};
SmartArray.prototype.insert = function(i, value) {
    this.values.splice(i, 0, value);
    this.onInserts.trigger(value, i);
};

SmartArray.prototype.onRemove = function(func) {
    this.onRemoves.add(func);
};
SmartArray.prototype.remove = function(i) {
    var value = this.values.splice(i, 1);
    this.onRemoves.trigger(value, i);
    return value;
};

SmartArray.prototype.replace = function(i, value) {
    this.values[i] = value;
    this.onRemoves.trigger(value, i);
    this.onInserts.trigger(value, i);
};

SmartArray.prototype.push = function (value) {
    this.values.push(value);
    this.onInserts.trigger(value, this.values.length - 1);
};
SmartArray.prototype.pop = function() {
    return this.remove(this.values.length - 1);
};
SmartArray.prototype.shift = function() {
    return this.remove(0);
};
SmartArray.prototype.unshift = function(value) {
    this.insert(0, value);
};
SmartArray.prototype.splice = function(start, deleteCount) {
    var args = arguments;
    for (var i=0; i<deleteCount; i++) 
        this.remove(start);
    for (var i=2; i<arguments.length; i++) 
        this.insert(arguments[i]);
};

SmartArray.prototype.render = function(transform) {
    var thiz = this;
    return function(el) {
        var installations = thiz.values.map(function(value, i) {
            return re.install(function() {
                return transform(value);
            }, el);
        });
        thiz.onInsert(function(value, i) {
            var elementAfter = installations[i-1].getElementAfter();
            var installation = re.install(function() {
                return transform(value);
            }, el, elementAfter);
            installations.splice(i, 0, installation);
        });
        thiz.onRemove(function(value, i) {
            installations[i].remove();
            installations.splice(i, 1);
        });
    };
};
