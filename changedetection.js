
var re = (function() {
    var re;     // just in case someone plays with global defs or needs to change name

    re = function re(arg1, arg2, arg3, arg4) {
        if (arg1 === undefined)
            return re.getterSetter();
        else if (typeof arg2 === 'string') {
            if (!Object.defineProperty)
                throw new Error('Object.defineProperty is not supported');
            if (arg3) {
                if (Array.isArray(arg3))
                    return re.arrayProperty(arg1, arg2, arg3);
                else
                    return re.relativeProperty(arg1, arg2, arg3, arg4);
            } else
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
    re.invalidate = invalidate;
    
    var currentDependent;
    var onInvalidateQueue = [];

    // a getterSetter that detects array changes
    re.getterSetter = function getterSetter() {
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
                    if (Array.isArray(value))
                        re.arrayFuncNotifiers(value);
                    out.value = value;
                    invalidate(out);
                } 
            }
        };
        
        return out;
    };

    re.arrayGetterSetter = function arrayGetterSetter(arr) {
        if (!arr._reProxy) {     // proxy array modifiers so changes can be noted
            arr._reProxy =  re.getterSetter();  
            arr._reProxy.value = arr;

            arr.getValueLocation = function getValueLocation(value) {
                for (var i=0; i<arr.length; i++) 
                    if (arr[i] === value)
                        return i;
                throw new Error('Position value not found in array');
            };

            arr.insertBeforeValue = function insertBeforeValue(item, positionValue) {
                return arr.splice(arr.getValueLocation(positionValue), 0, item);
            };

            arr.removeValue = function removeValue(item) {
                return arr.splice(arr.getValueLocation(item), 1);
            };

            ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
                .forEach(function(method) {
                    var func = arr[method];
                    arr[method] = function() {
                        func.apply(this, arguments);
                        invalidate(arr._reProxy);
                    };
                });
        }
        return arr._reProxy;
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
                // if this is the root call, process any outstanding onInvalidate callbacks
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


    re.arrayFuncNotifiers = function arrayFuncNotifiers(arr) {
        if (!arr._funcNotifiers) {
            arr._funcNotifiers = re.arrayGetterSetter(arr);

            ['reduce', 'forEach', 'map', 'filter']
                .forEach(function(fName) {
                    var func = arr[fName];
                    arr[fName] = function() {
                        arr._funcNotifiers.get();
                        return func.apply(arr, arguments);
                    };
                });
        }
    };
  
    
    if (Object.defineProperty) {

        re.alerterProperty = function alerterProperty(obj, prop) {
            var value = obj[prop];
            var gs = re.getterSetter();
            gs.set(value);
            Object.defineProperty(obj, prop, {
                get: gs.get, 
                set: gs.set   
            });
            return gs;
        };
        
        re.relativeProperty = function relativeProperty(obj, prop, getter, setter) {
            var gs = re.relativeGetterSetter(getter, setter);
            Object.defineProperty(obj, prop, {
                get: gs.get,
                set: gs.set
            });
            return gs;
        };
    }

    return re;
})();

if (this)
    this.re = re;
