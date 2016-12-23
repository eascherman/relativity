
re.on = (name, callback) => el => el.addEventListener(name, ev => callback(ev));
(function() {
    [   'click', 'dblclick', 'wheel',
        'keydown', 'keyup',
        'input', 'focus', 'blur', 
        'drag', 'dragstart', 'dragover', 'dragstop', 'drop', 
        'mousedown', 'mouseup', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout'
    ].forEach(eventName => re.on[eventName] = callback => re.on(eventName, callback));

    re.on.wheel.down = callback => re.on.wheel(function(ev) {
        if (ev.wheelData < 0)
            callback(ev);
    });
    re.on.wheel.up = callback => re.on.wheel(function(ev) {
        if (ev.wheelData > 0)
            callback(ev);
    });

    // keystroke sugar:
    //  re.on.keydown.g(ev => console.log('you pressed g!'));
    //  re.on.keydown.ctrl.s(functionThatSavesMyStuff)(document.body);
    ['keydown', 'keyup'].forEach(function(evName) {
        setupProperty(re.on, evName, loadKeyNames);
    });

    var chars = [];
    var otherKeys;
    function loadKeyNames(evName) {
        if (!chars)
            for (var i=0 ; i<230 ; i++) {
                var char = String.fromCharCode(i);
                if (char.length != "")
                    chars.push(char);
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
                if (String.fromCharCode(ev.which) === char) {
                    ev.preventDefault();
                    callback(ev); 
                }
            });

            evSetup.ctrl[char] = callback => evSetup(function(ev) {
                if ((ev.ctrlKey || ev.metaKey) && String.fromCharCode(ev.which) === char) {
                    ev.preventDefault();
                    callback(ev); 
                }
            });
            evSetup.shift[char] = callback => evSetup(function(ev) {
                if (ev.shiftKey && String.fromCharCode(ev.which) === char) {
                    ev.preventDefault();
                    callback(ev); 
                }
            });
            evSetup.alt[char] = callback => evSetup(function(ev) {
                if (ev.altKey && String.fromCharCode(ev.which) === char) {
                    ev.preventDefault();
                    callback(ev); 
                }
            });
        });
    };
    
    // performs an action once when a property is first used via a getter and then removes function based property
    function setupProperty(obj, prop, loader) {
        if (true)   //(!Object.defineProperty)   property method currently disabled
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

})();


function LinkedList(arr) {
    this.onInsertCallbacks = [];
    this.onRemoveCallbacks = [];
    re(this, 'first');
    re(this, 'last');
    
    var thiz = this;
    if (arr)
        arr.forEach(forEach(item) {
            thiz.append(item)
        });
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

re.mapRender = function map(arrGetter, transform, remover) {
    if (!remover)
        remover = function(installation) {
            installation.remove();
        };

    var installations = [];
    var result = [];
    var priorArr = [];

    return function(el, parentLocation) {
        var arr = arrGetter();
        re(arr).get();              // ensure changes to the array are triggered for this function
        var i = 0;
        var j = 0;

        while (i < arr.length && j < priorArr.length) {     // todo: handle scenarios where more than one is removed/inserted at once
            if (arr[i] === priorArr[j]) {       // match
                i++, j++;
            } else if (arr[i+1] === priorArr[j]) {        // one inserted
                var val = arr[i];
                var content = transform(val);

                var followingInstallation = installations[j];
                var elementAfter = followingInstallation.getFirstElement();
                var installation;
                if (followingInstallation)
                    installation = followingInstallation.insertContent(content);
                else
                    installation = parentLocation.installChild(content, el);

                installations.splice(j, 0, installation);
                result.splice(j, 0, content);
                i++;
            } else if (arr[i] === priorArr[j+1]) {        // one removed
                var inst = installations.splice(i, 1)[0];
                remover(inst);
                result.splice(i, 1);
                j++;
            } else {           // not sure what it is, remove it
                var inst = installations.splice(i, 1)[0];
                remover(inst);
                result.splice(i, 1); 
                j++;
            }
        }

        if (j < priorArr.length) {      // get rid of final entries no longer present
            while (j < result.length) {
                var inst = installations.splice(i, 1)[0];
                remover(inst);
                result.splice(i, 1);
            }
        } else {                        // add new final entries 
            while (i < arr.length) {
                var content = transform(arr[i]);

                var installation = parentLocation.installChild(content, el);
                installations.push(installation);
                result.push(content);
                i++;
            }
        } 

        priorArr = arr.concat([]);
    };
};
