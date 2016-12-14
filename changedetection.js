
var re;

(function() {
    
    re = function re(arg1, arg2, arg3, arg4) {
        if (arg1 === undefined)
            return re.getterSetter();
        else if (typeof arg2 === 'string') {
            if (arg3)
                return re.relativeProperty(arg1, arg2, arg3, arg4);
            else
                return re.alerterProperty(arg1, arg2);
        } else if (arg1 instanceof Function)
            return re.relativeGetterSetter(arg1, arg2);
    };
    
    var counter = 0;
    function newId() {
        return counter++;
    }
    
    function invalidate(obj) {
        var deps = obj.dependents;
        obj.dependents = {};
        obj.cache = undefined;
        Object.keys(deps).forEach(function(key) {
            invalidate(deps[key]);
        });
        if (obj.onInvalidate) {
            if (currentDependent)
                onInvalidateQueue.push(obj.onInvalidate);
            else
                obj.onInvalidate();
        }
    }
    
    var currentDependent;
    var onInvalidateQueue = [];

    re.getterSetter = function relativeGetterSetter() {
        var out = {
            id: newId(),
            dependents: {},
            get: function get() {
                if (currentDependent)
                    out.dependents[currentDependent.id] = currentDependent;
                return out.value;
            },
            set: function set(value) {
                if (out.value !== value) {
                    out.value = value;
                    invalidate(out);
                }
            }
        };
        
        return out;
    };

    re.relativeGetterSetter = function relativeGetterSetter(getter, setter) {
        var out = {
            id: newId(),
            dependents: {},
            get: function get() {
                if (currentDependent)
                    out.dependents[currentDependent.id] = currentDependent;
                // use the getter if there's no valid cache
                if (!out.cache) {
                    var oldDependent = currentDependent;
                    currentDependent = out;
                    try {
                        out.cache = {value: getter()};
                    } catch (err) { 
                        throw err;
                    }
                    currentDependent = oldDependent;   
                }
                // if this is the root call, process any outstanding onInvalidte callbacks
                if (!currentDependent) {
                    var queue = onInvalidateQueue;
                    onInvalidateQueue = [];
                    queue.forEach(function(func) {
                        func();
                    })
                }
                return out.cache.value;
            }
        };
        
        if (setter)
            out.set = function set(value) {
                setter(value);
                invalidate(out);
            };
        
        return out;
    };
    
    re.onChange = function onChange(trigger, callback) {
        var gs = re.relativeGetterSetter(trigger);
        var continues = true;
        gs.onInvalidate = function onChangeCallback() {
            if (continues) {
                gs.get();
                if (callback)
                    callback();
            }
        };
        gs.get();
        return {
            cancel: function cancelOnChange() {
                gs.onInvalidate = undefined;
                continues = false;
            }
        };   
    };
    
    

    re.alerterProperty = function alerterProperty(obj, prop) {
        var value = obj[prop];
        var gs = re.getterSetter();
        gs.set(value);
        Object.defineProperty(obj, prop, {
            get: gs.get, 
            set: gs.set   
        });
    };
    
    re.relativeProperty = function relativeProperty(obj, prop, getter, setter) {
        var gs = re.relativeGetterSetter(getter, setter);
        Object.defineProperty(obj, prop, {
            get: gs.get,
            set: gs.set
        });
    };

})();

if (this)
    this.re = re;