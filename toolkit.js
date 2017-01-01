/*
var listen = (name, callback) => ele => ele.addEventListener(name, ev => callback(ev));
var bind = (obj, prop) => listen('input', ev => obj[prop] = ev.target.value); 
*/
re.on = (name, callback) => el => el.addEventListener(name, ev => callback(ev));
(function() {
    [   'click', 'dblclick', 'wheel',
        'keydown', 'keyup',
        'input', 'focus', 'blur', 
        'drag', 'dragstart', 'dragover', 'dragstop', 'drop', 
        'mousedown', 'mouseup', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout'
    ].forEach(eventName => re.on[eventName] = callback => re.on(eventName, callback));

    re.on.wheel.down = callback => re.on.wheel(function(ev) {
        ev.preventDefault();
        if (ev.wheelDelta < 0)
            callback(ev);
    });
    re.on.wheel.up = callback => re.on.wheel(function(ev) {
        ev.preventDefault();
        if (ev.wheelDelta > 0)
            callback(ev);
    });

    // keystroke sugar:
    //  re.on.keydown.g(ev => console.log('you pressed g!'));
    //  re.on.keydown.ctrl.s(functionThatSavesMyStuff)(document.body);

    var chars;
    var otherKeys;
    function loadKeyNames(evName) {
        if (!chars) {
            chars = [];
            for (var i=0 ; i<230 ; i++) {
                var char = String.fromCharCode(i);
                if (char.length != "")
                    chars.push(char);
            }
        }
        if (!otherKeys)
            otherKeys = {
                shift:16, ctrl:17, alt:18,
                backspace:8, tab:9, enter:13, pause:19, capsLock:20, escape:27,
                pageUp:33, pageDown:34, end:35, home:36, left:37, up:38, right:39, down:40,
                insert:45, delete:46, 
                leftWindow:91, rightWindow:92, select:93, f1:112, f2:113, f3:114, f4:115, 
                f5:116, f6:117, f7:118, f8:119, f9:120, f10:121, f11:122, f12:123, numLock:144,
                scrollLock:145
            };
            
        var evSetup = re.on[evName];

        Object.keys(otherKeys).forEach(function(keyName) {
            evSetup[keyName] = callback => evSetup(function(ev) {
                if (otherKeys[keyName] === ev.which) {
                    ev.preventDefault();
                    callback(ev); 
                }
            });
        });

        chars.forEach(function(char) {
            evSetup[char] = callback => evSetup(function(ev) {
                if (String.fromCharCode(ev.which).toLowerCase() === char) {
                    ev.preventDefault();
                    callback(ev); 
                }
            });

            evSetup.ctrl[char] = callback => evSetup(function(ev) {
                if ((ev.ctrlKey || ev.metaKey) && String.fromCharCode(ev.which).toLowerCase() === char) {
                    ev.preventDefault();
                    callback(ev); 
                }
            });
            evSetup.shift[char] = callback => evSetup(function(ev) {
                if (ev.shiftKey && String.fromCharCode(ev.which).toLowerCase() === char) {
                    ev.preventDefault();
                    callback(ev); 
                }
            });
            evSetup.alt[char] = callback => evSetup(function(ev) {
                if (ev.altKey && String.fromCharCode(ev.which).toLowerCase() === char) {
                    ev.preventDefault();
                    callback(ev); 
                }
            });
        });
    };
    
    // performs an action once when a property is first used via a getter and then removes function based property
    function setupProperty(obj, prop, loader) {
        if (true) // (!Object.defineProperty)
            loader(prop);
        else {
            var holder = obj[prop];
            Object.defineProperty(obj, prop, {
                get: function() {
                    loader(prop);

                    Object.defineProperty(obj, prop, {
                        value: obj[prop],
                        enumerable: true
                    });
                }, 
                enumerable: true,
                configurable: true
            });
        }
    }
    
    ['keydown', 'keyup'].forEach(function(evName) {
        setupProperty(re.on, evName, loadKeyNames);
    });


})();

/*
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
*/


/////////////////////////////////////////////
/////               Router
/////////////////////////////////////////////

/*
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
        
    return route;
}

*/

(function() {
    var hashRouter;

    re.getHashRouter = function getHashRouter() {
        if (!hashRouter) {
            hashRouter = {};
            var gsLoc = re(hashRouter, 'location', function() {
                return window.location;
            });

            ['hash', 'search', 'pathname'].map(function(prop) {
                return re(hashRouter, prop, function get() {
                    return hashRouter.location[prop];
                }, function set(value) {
                    hashRouter.location[prop] = value;
                });
            });

            var ops = window.onpopstate;
            window.onpopstate = function(ev) {
                re.invalidate(gsLoc);
                if (ops)
                    ops(ev);
            };

            var priorLoc;
            setInterval(function() {
                var loc = window.location.toString();
                if (priorLoc !== loc)
                    re.invalidate(gsLoc);
                priorLoc = loc;
            }, 500);
        }
        return hashRouter;
    };
})();


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

re.mapInstall = function(arr, transform) {
    var changeTrigger = re();

    var changes = [];
    if (!arr._reMapNotifiers) {

        var push = arr.push;
        arr.push = function(val) {
            push.call(arr, val);
            changes.push(function(el, parentLocation) {
                var cont = transform(val, function getPos() {
                    for (var i=0; i<arr.length; i++)
                        if (val === arr[i])
                            return i;
                }, arr);
                var inst = parentLocation.installChild(cont, el);
                installations.push(inst);
            });
            re.invalidate(changeTrigger);
        };

        var pop = arr.pop;
        arr.pop = function() {
            pop.apply(arr);
            changes.push(function(el) {
                var inst = installations.pop();
                inst.remove();
            });
            re.invalidate(changeTrigger);
        };

        var shift = arr.shift;
        arr.shift = function() {
            shift.apply(arr);
            changes.push(function(el) {
                var inst = installations.shift();
                inst.remove();
            });
            re.invalidate(changeTrigger);
        };

        var unshift = arr.unshift;
        arr.unshift = function(val) {
            unshift.call(arr, val);
            changes.unshift(function(el, parentLocation) {
                var cont = transform(val, function getPos() {
                    for (var i=0; i<arr.length; i++)
                        if (val === arr[i])
                            return i;
                }, arr);
                var inst = parentLocation.installChild(cont, el);
                installations.unshift(inst);
            });
            re.invalidate(changeTrigger);
        };

        var splice = arr.splice;
        arr.splice = function(pos, deleteCount) {
            var priorInst = installations[pos];
            splice.apply(arr, arguments);
            var args = arguments;
            changes.push(function(el) {
                var instSpliceArgs = [pos, deleteCount];
                for (var i=2; i<args.length; i++) {
                    var val = args[i];
                    var cont = transform(val, function getPos() {
                        for (var i=0; i<arr.length; i++)
                            if (val === arr[i])
                                return i;
                    }, arr);
                    var inst = priorInst.insertContent(cont);
                    priorInst = inst;
                    instSpliceArgs.push(inst);
                }
                var deletedInsts = installations.splice.apply(installations, instSpliceArgs);
                deletedInsts.forEach(function(inst) {
                    inst.remove();
                });
            });
            re.invalidate(changeTrigger);
        };

        // todo: sort, reverse
    }

    var installations = [];
    var initialized = false;
    return function(el, parentLocation) {
        if (!initialized) {
            initialized = true;

            arr.forEach(function(val) {
                var cont = transform(val, function getPos() {
                    for (var i=0; i<arr.length; i++)
                        if (val === arr[i])
                            return i;
                }, arr);
                var inst = parentLocation.installChild(cont, el);
                installations.push(inst);
            }, arr);
        }

        changeTrigger.get();
        var pendingChanges = changes;
        changes = [];
        pendingChanges.forEach(function(change) {
            change(el, parentLocation);
        })
    };
};
