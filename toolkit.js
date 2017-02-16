
re.on = function(name, callback) {
    return function(el) {
        return el.addEventListener(name, callback);
    };
};

(function() {
    [   'click', 'dblclick', 'wheel',
        'keydown', 'keyup',
        'input', 'focus', 'blur', 
        'drag', 'dragstart', 'dragover', 'dragstop', 'drop', 
        'mousedown', 'mouseup', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout'
    ].forEach(function(eventName) {
        re.on[eventName] = function(callback) {
            return re.on(eventName, callback);
        };
    });

    re.on.wheel.down = function wheelDown(callback) {
        return re.on.wheel(function(ev) {
            ev.preventDefault();
            if (ev.wheelDelta < 0)
                callback(ev);
        });
    };
    re.on.wheel.up = function wheelUp(callback) { 
        return re.on.wheel(function(ev) {
            ev.preventDefault();
            if (ev.wheelDelta > 0)
                callback(ev);
        });
    };

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
                leftWindow:91, rightWindow:92, select:93, 
                f1:112, f2:113, f3:114, f4:115, f5:116, f6:117, f7:118, f8:119, f9:120, f10:121, f11:122, f12:123, 
                numLock:144, scrollLock:145
            };
            
        var evSetup = re.on[evName];

        Object.keys(otherKeys).forEach(function(keyName) {
            evSetup[keyName] = function(callback) {
                return evSetup(function(ev) {
                    if (otherKeys[keyName] === ev.which) {
                        ev.preventDefault();
                        callback(ev); 
                    }
                });
            };
        });

        chars.forEach(function(char) {
            evSetup[char] = function(callback) { 
                return evSetup(function(ev) {
                    if (String.fromCharCode(ev.which).toLowerCase() === char) {
                        ev.preventDefault();
                        callback(ev); 
                    }
                });
            };

            evSetup.ctrl[char] = function(callback) { 
                return evSetup(function(ev) {
                    if ((ev.ctrlKey || ev.metaKey) && String.fromCharCode(ev.which).toLowerCase() === char) {
                        ev.preventDefault();
                        callback(ev); 
                    }
                });
            };
            evSetup.shift[char] = function(callback) { 
                return evSetup(function(ev) {
                    if (ev.shiftKey && String.fromCharCode(ev.which).toLowerCase() === char) {
                        ev.preventDefault();
                        callback(ev); 
                    }
                });
            };
            evSetup.alt[char] = function(callback) { 
                return evSetup(function(ev) {
                    if (ev.altKey && String.fromCharCode(ev.which).toLowerCase() === char) {
                        ev.preventDefault();
                        callback(ev); 
                    }
                });
            };
        });
    };
    
    // performs an action once when a property is first used via a getter and then removes function based property
    function setupProperty(obj, prop, loader) {
        //if (!Object.defineProperty) 
            loader(prop);
        /*else {
            var holder = obj[prop];
            Object.defineProperty(obj, prop, {
                get: function() {
                    loader(prop);
                    var out = obj[prop];
                    Object.defineProperty(obj, prop, {
                        value: obj[prop],
                        enumerable: true
                    });
                    return out;
                }, 
                enumerable: true,
                configurable: true
            });
        }*/
    }
    
    ['keydown', 'keyup'].forEach(function(evName) {
        setupProperty(re.on, evName, loadKeyNames);
    });


})();


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
            }, 200);
        }
        return hashRouter;
    };
})();


(function() {

    function eventTrigger(thiz) {
        var counter = 1;
        var out = function(callback) {
            var id = counter++;
            out.dependents[id] = callback;
            out.remove = function() {
                delete out.dependents[id];
            };
        };
        out.trigger = function() {
            var args = arguments;
            Object.keys(out.dependents).forEach(function(key) {
                var callback = out.dependents[key];
                callback.apply(thiz, args);
            });
        };
        out.dependents = {};

        return out;
    }

    re.alertArray = function(arr) {
        if (!arr.onRemove) {
            arr.onRemove = eventTrigger(arr);
            arr.onInsert = eventTrigger(arr);

            var push = arr.push;
            arr.push = function(val) {
                var out = push.call(arr, val);
                arr.onInsert.trigger(val, arr.length);
                return out;
            };

            var pop = arr.pop;
            arr.pop = function() {
                var out = pop.apply(arr);
                arr.onRemove.trigger(arr.length - 1);
                return out;
            };

            var shift = arr.shift;
            arr.shift = function() {
                var out = shift.apply(arr);
                arr.onRemove.trigger(0);
                return out;
            };

            var unshift = arr.unshift;
            arr.unshift = function(val) {
                var out = unshift.call(arr, val);
                arr.onRemove.trigger(val, 0);
                return out;
            };

            var splice = arr.splice;
            arr.splice = function(pos, deleteCount) {
                pos = pos.valueOf(); 
                var out = splice.apply(arr, arguments);
                while (deleteCount > 0) {
                    arr.onRemove.trigger(pos + deleteCount - 1);
                    deleteCount--;
                }
                for (var i=2; i<arguments.length; i++) {
                    var item = arguments[i];
                    arr.onInsert.trigger(item, pos + i - 2);
                }
                return out;
            };
        }
    };

    re.bindMap = function(arr, transform) {
        function posGetter(val) {
            var out = function getPos() {
                for (var i=0; i<arr.length; i++)
                    if (val === arr[i])
                        return i;
            };
            out.valueOf = out;
            return out;
        };

        // map via for loop to prevent undesired change detection
        var out = [];
        for (var i=0; i<arr.length; i++) {
            var item = arr[i];
            var tItem = transform(item, posGetter(item), arr);
            out.push(tItem);
        }

        re.alertArray(arr);
        arr.onRemove(function(pos) {
            return out.splice(pos, 1);
        });
        arr.onInsert(function(item, pos) {
            var tItem = transform(item, posGetter(item), arr);
            return out.splice(pos, 0, tItem);
        });

        return out;
    };

    re.arrInstall = function(arr) {
        re.alertArray(arr);
        var initialized = false;
        var installations = [];

        return function(el, loc) {
            if (!initialized) {
                initialized = true;

                arr.onRemove(function(pos) {
                    arr;
                    var inst = installations[pos];
                    inst.remove();
                    installations.splice(pos, 1);
                });
                arr.onInsert(function(item, pos) {
                    arr;
                    var instPos = installations[pos];
                    var inst;
                    if (instPos)
                        inst = instPos.insertContent(item);
                    else
                        inst = loc.installChild(item, el);
                    installations.splice(pos, 0, inst);
                });

                arr.forEach(function(item) {
                    var inst = loc.installChild(item, el);
                    installations.push(inst);
                });
            }
        };
    };

    re.mapInstall = function(arr, transform) {
        return re.arrInstall(re.bindMap(arr, transform));
    };
    re.for = re.mapInstall;

})();
