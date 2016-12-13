
'use strict';


this.R = (function () {
    var topOfDependencyStack;
    
    function relLog(stuff) {
        //relLog(stuff);
    }

    function funcIfString(f) {
        if (typeof f === 'string' || f instanceof String)
            f = new Function('return ' + f + ';');
        return f;
    }

    function R(arg1, arg2, getter, setter) {
        if (arg1 instanceof Function)        // enable R(() => o.c = o.a + o.b);
            return R.maintain(arg1, arg2);      // arg1 called in detector, arg 2 as a callback afterward
        else if (getter)
            return R.relative(arg1, arg2, getter, setter);      // arg 1 object, arg2 name of property
        else
            return R.alerter(arg1, arg2);       
    };

    R.alerter = function alerter(obj, name) {
        var cachedValue = obj[name];
        var dependents = {};
        Object.defineProperty(obj, name, {
            get: function () {
                if (topOfDependencyStack)
                    dependents[topOfDependencyStack._id] = topOfDependencyStack;
                return cachedValue;
            },
            set: function (value) {
                if (!(cachedValue === value)) {
                    cachedValue = value;
                    for (var d in dependents)
                        dependents[d].invalidate();
                    dependents = {};    // clears every time so abandoned relative values make it to garbage collector
                }
                return cachedValue;

            }
        });
    };

    // uses an id system to prevent the creation of duplicate dependencies
    var relativeIdCounter = 1;
    function getNewId() {
        //return Symbol();
        return relativeIdCounter++;
    }

    // declares a relative value dependent upon alerter values and/or other relative values
    R.relative = function relative(obj, name, getter, setter) {
        getter = funcIfString(getter);
        setter = funcIfString(setter);
        var _id = getNewId();
        var cachedValue;
        if (!setter)
            setter = function (value) {
                throw new Error(name + ' is an unassignable relative value');
            };

        var s = {
            _id: _id,
            inputs: {},
            invalidate: function () {
                if (this.parent && cachedValue)
                    this.parent.invalidate();
                cachedValue = null;
                relLog(name + ' invalidated!');
            }
        };

        Object.defineProperty(obj, name, {
            enumerable: true,
            get: function () {
                if (!cachedValue) {
                    // provide cached value invalidator to values that are called by the getter

                    if (topOfDependencyStack)
                        s.parent = topOfDependencyStack;
                    var priorTop = topOfDependencyStack;
                    topOfDependencyStack = s

                    // retrieve the value
                    cachedValue = { value: getter() };

                    // return parent to top of stack
                    topOfDependencyStack = priorTop;
                }
                return cachedValue.value;
            },
            set: setter
        });

        return s;
    };

    R.bind = function bind(getter, obj, name) {
        getter = funcIfString(getter);
        function setupBinding() {
            R.onValueChange(getter, function () {
                obj[name] = 'asdf o.c = ' + o.c;
                setupBinding();
            });
        }
        setupBinding();
    };

    R.maintain = function maintain(func, tailCallback) {
        var cont = true;
        var out = { cancel: function () { cont = false; } };
        function setupBinding() {
            R.onValueChange(func, function () {
                if (cont) {
                    setupBinding();
                if (tailCallback)
                    tailCallback();
                }
            });  
        }
        setupBinding();
        return out;
    };

    /*R.maintain = function maintain(func, tailCallback) {
        var cont = true;
        var out = { cancel: function () { cont = false; } };
        function setupBinding() {
            R.onValueChange(func, function () {
                if (cont) {
                    func();
                    setupBinding();
                }
            });       // testing immediate
            if (tailCallback)
                tailCallback();
        }
        setupBinding();
        return out;
    };*/
    
    // when the getter value changes, the callback will execute
    R.onValueChange = function onValueChange(getter, callback, immediate) {
        getter = funcIfString(getter);
        var callingBack = false;
        var s = {
            _id: getNewId(),
            inputs: {},
            invalidate: function () {
                relLog('value change triggered!');
                if (!callingBack) {
                    callingBack = true;
                    function func() {
                        callback();
                        callingBack = false;
                    }
                    if (immediate)
                        func();
                    else
                        setTimeout(func);   // todo: remove (seems to not handle multiple calls without)
                }
            }
        };

        if (topOfDependencyStack) {
            topOfDependencyStack.inputs[s._id] = s;
            s.parent = topOfDependencyStack;
        }
        var priorTop = topOfDependencyStack;
        topOfDependencyStack = s

        // trigger getter to establish dependencies
        var g = getter();

        // return parent to top of stack
        topOfDependencyStack = priorTop;

        // provide a cancellation mechanism
        var out = {
            cancel: function () {
                callback = function () { };
            }
        };
        return out;
    }
    
    

    return R;
})();


R.selfTest = function() {
    
    var sequence = [];
    
    function ensure(message) {
        if (!sequence[0])
            throw Error('Message when none expected: ' + message);
        else {
            var m = sequence.shift();
            if (m != message)
                throw Error('Unexpected message: ' + message + '. Expected message was: ' + m);
        }
    }
    
    var test = {};
    R(test, 'v1');
    R(test, 'v2');
    R(test, 'v3', () => test.v1 + test.v2);
    test.v1 = 9;
    test.v2 = 8;
    
    // value change
    sequence = ['v1 evaluated: 9'];
    var change = R.onValueChange(function() {
        ensure('v1 evaluated: ' + test.v1);
    }, function() {
        ensure('v1 callback triggered: ' + test.v1);
    });
    sequence = ['v3 get 17'];
    var change2 = R.onValueChange(function() { 
        ensure('v3 get ' + test.v3)
    }, function () {
        ensure('v3 cb ' + test.v3);
    });
    sequence = ['v1 callback triggered: 10', 'v3 cb 18'];
    test.v1 = 10;
    test.v1 = 11;
    change.cancel();
    change2.cancel();
    
    // maintain
    sequence = ['v1 evaluated: 11', 'v1 callback triggered: 11'];
    var maint = R(function() {
        ensure('v1 evaluated: ' + test.v1);
    }, function() {
        ensure('v1 callback triggered: ' + test.v1);
    });
    sequence = ['v1 evaluated: 8', 'v1 callback triggered: 8'];
    test.v1 = 8;
    sequence = ['v1 evaluated: 7', 'v1 callback triggered: 7'];
    test.v1 = 7;
    
    sequence = ['v3 get 15', 'v1 evaluated: 6', 'v1 callback triggered: 6', 'v3 cb 14'];
    var maint2 = R(() => ensure('v3 get ' + test.v3), () => ensure('v3 cb ' + test.v3));
    test.v1 = 6;
    maint.cancel();
    maint2.cancel();
    
};

R.selfTest();
