
function isString(myVar) {
    return (typeof myVar === 'string' || myVar instanceof String);
}
        
        
(() => {
    var placeholderCounter = 0;

    //////////////////////////////////////////////////
    /////                Bundle
    //////////////////////////////////////////////////

    function Bundle(strings, values) {
        this.strings = strings;
        this.values = values;
    }

    function bundle(strings) {
        var values = [];
        for (var i = 1 ; i < arguments.length ; i++)
            values.push(arguments[i]);
        return new Bundle(strings, values);
    }


    //////////////////////////////////////////////////
    /////               Cursor
    //////////////////////////////////////////////////

    function Cursor(b) {
        var stringCursor = 0;
        var charCursor = 0;

        this.getStringCursor = function() {
            return stringCursor;
        };

        function thisString() {
            return b.strings[stringCursor];
        }

        this.thisChar = function() {
            var ts = thisString();
            if (!ts)
                return undefined;
            return ts[charCursor];
        };
        
        this.thisItem = function() {
            if (charCursor == -1)
                return b.values[stringCursor - 1];
            else
                return this.thisChar();
        };
        
        this.isComplete = function() {
            return stringCursor >= b.strings.length;
        };
        
        this.step = function() {
            // increment cursor positions
            var ts = thisString();
            if (charCursor >= ts.length - 1) {
                charCursor = -1;
                stringCursor++;
            } else
                charCursor++;
                
            // return the new current item
            return this.thisItem();
        }

        function remainingStrings() {
            var out = '';
            var cc = Math.max(charCursor, 0);
            for (var i = stringCursor ; i < b.strings.length ; i++) {
                for (var j = cc ; j < b.strings[i].length ; j++)
                    out += b.strings[i][j];
                cc = 0;
            }
            return out;
        }
        this.remainingStrings = remainingStrings;
        
        this.collectStaticsThrough = function(terminators, includeTerminator) {
            var rs = remainingStrings;
            if (includeTerminator === undefined)
                includeTerminator = false;
            var out = [];
            if (charCursor == -1)
                out.push(stringCursor - 1);
            var firstTerminator;
            while (!firstTerminator && stringCursor < b.strings.length) {
                var ts = thisString();
                terminators.forEach(function (t) {
                    var loc = ts.indexOf(t, charCursor);
                    if (loc > -1 && (!firstTerminator || (firstTerminator && loc < firstTerminator.location)))
                        firstTerminator = {
                            location: loc,
                            string: t
                        };
                });
                if (firstTerminator) {
                    var finalChar = firstTerminator.location;
                    if (includeTerminator)
                        finalChar += firstTerminator.string.length;
                    var piece = thisString().substring(charCursor, finalChar);
                    if (piece.length > 0)
                        out.push(piece);
                    charCursor = finalChar;
                    out.terminator = firstTerminator;
                    return out;
                } else {
                    var piece = thisString().substring(charCursor);
                    if (piece.length > 0)
                        out.push(piece);
                    if (stringCursor < b.values.length)
                        out.push(stringCursor);
                    charCursor = 0;
                    stringCursor++;
                }
            }
            return out;
        };
        
        /*this.collectThrough = function(terminators, includeTerminator) {
            var rs = remainingStrings;
            if (includeTerminator === undefined)
                includeTerminator = false;
            var out = [];
            if (charCursor == -1)
                out.push(this.thisItem());
            var firstTerminator;
            while (!firstTerminator && stringCursor < b.strings.length) {
                var ts = thisString();
                terminators.forEach(function (t) {
                    var loc = ts.indexOf(t, charCursor);
                    if (loc > -1 && (!firstTerminator || (firstTerminator && loc < firstTerminator.location)))
                        firstTerminator = {
                            location: loc,
                            string: t
                        };
                });
                if (firstTerminator) {
                    var finalChar = firstTerminator.location;
                    if (includeTerminator)
                        finalChar += firstTerminator.string.length;
                    var piece = thisString().substring(charCursor, finalChar);
                    if (piece.length > 0)
                        out.push(piece);
                    charCursor = finalChar;
                    out.terminator = firstTerminator;
                    return out;
                } else {
                    var piece = thisString().substring(charCursor);
                    if (piece.length > 0)
                        out.push(piece);
                    if (stringCursor < b.values.length)
                        out.push(b.values[stringCursor]);
                    charCursor = 0;
                    stringCursor++;
                }
            }
            return out;
        };*/
    }


    //////////////////////////////////////////////////
    /////             Compilation
    //////////////////////////////////////////////////

    function CompiledHtmlAttribute (name, value, bounder) {
        this.name = name;
        this.value = value;
        this.bounder = bounder;
    }
    CompiledHtmlAttribute.prototype.evaluate = function(host, obj) {
        if (!(obj instanceof Object)) {
            return obj;
        } else if (obj instanceof Array) {
            return obj.map(o => this.evaluate(host, o)).join('');
        } else if (obj instanceof Bundle) {
            // todo: fill
        } else if (obj instanceof Function) {
            var result = obj(host);
            return this.evaluate(host, result);
        } else {
            return obj.toString();
        }
    };
    CompiledHtmlAttribute.prototype.getName = function(host) {
        return this.evaluate(host, this.name);
    };
    CompiledHtmlAttribute.prototype.getValue = function(host) {
        return this.evaluate(host, this.value);
    };
    
    function compileAttribute(cursor) {
        if (cursor.isComplete())
            return undefined;
        
        var attrName;
        var attrBounder;
        
        var tc = cursor.thisChar();    
        
        // move through white space
        while (tc == ' ' || tc == '\r' || tc == '\n') {
            cursor.step();
            tc = cursor.thisChar();
        }
            
        // bail if there's nothing here (end of tag reached)
        if (tc == '/' || tc == '>') 
            return undefined;
            
        if (tc === undefined) {
            var valueLoc = cursor.getStringCursor() - 1;
            cursor.step();
            return valueLoc;
        } else {
            var nameCollection = cursor.collectStaticsThrough(['=', ' ', '\r', '\n', '/', '>']);
            if (nameCollection.length > 1)      // todo: may be able to relax this limitation
                throw Error('Complex attribute names are not supported');
            attrName = nameCollection[0];
        }
        
        // determine attr value, if it exists
        tc = cursor.thisChar();
        if (tc == '=') {
            cursor.step();
            attrBounder = cursor.thisChar();
            if (attrBounder != '"' && attrBounder != "'")
                throw Error('Attribute values must be enclosed in " or \'');
            cursor.step();
            
            var staticsCollection = cursor.collectStaticsThrough([attrBounder]);
            cursor.step();      // move past closing attrBounder
            
            return function(values) {
                var attrValue = staticsCollection.map(function(item) {
                    if (typeof item == 'string')
                        return item;        // number is a value index
                    else
                        return values[item];                // string is plain markup
                });
                return new CompiledHtmlAttribute(attrName, attrValue, attrBounder);
            };
        } else {
            return function(values) {
                return new CompiledHtmlAttribute(attrName);
            }
        }
        
        

    }

    function compileAttributes(cursor) {
        var attrs = [];
        
        var ca = true;
        while(ca !== undefined) {
            var tc = cursor.thisChar();
            
            // move through white space
            while (tc == ' ' || tc == '\r' || tc == '\n') {
                cursor.step();
                tc = cursor.thisChar();
            }
                
            // bail if there's nothing here (end of tag reached)
            if (tc == '/' || tc == '>') 
                ca = null;
                
            ca = compileAttribute(cursor);
            if (ca !== undefined) {
                attrs.push(ca);
            }
        }
        
        return function(values) {
            return attrs.map(function(attr) {
                if (typeof attr == 'string')
                    return attr;
                else if (attr instanceof Function)
                    return attr(values);
                else
                    return values[attr];
            });
        };
    }

    function CompiledHtmlElement(name, attributes, contents) {
        this.name = name;
        this.attributes = attributes;
        this.contents = contents;
    }

    function compileElement(cursor) {
        var tagStart = cursor.collectStaticsThrough(['>', '/>', ' ', '\n', '\r']);
        var tagName = tagStart[0].substring(1);
        var tagAttrs = compileAttributes(cursor);
        var tagEnding = cursor.collectStaticsThrough(['>', '/>'], true);
        
        if (tagEnding.terminator.string == '/>') {
            return function(values) {
                return new CompiledHtmlElement(tagName, tagAttrs(values));
            };
        }  else {
            var innards = compileHtml(cursor);
            var closeTag = cursor.collectStaticsThrough(['>'], true);
            var closeTagName = closeTag[0].substring(2, closeTag[0].length - 1); 
            if (closeTagName != tagName)
                throw Error(`Unexpected closing tag: expecting </${tagName}>, found </${closeTagName}>`);
            return function(values) {
                return new CompiledHtmlElement(tagName, tagAttrs(values), innards(values));
            };
        }
    }

    var compiledBundles = { 
        html: {}
    };
    
    function getCompiledHtmlBundle(b) {
        var sig = JSON.stringify(b.strings);
        if (!compiledBundles.html[sig]) {
            var cursor = new Cursor(b);
            compiledBundles.html[sig] = compileHtml(cursor);
        }
        return compiledBundles.html[sig](b.values);
    }

    function compileHtml(cursor) {
        if (cursor.isComplete())
            throw Error('invalid cursor');
                        
        var nodes = [];

        var externalEndingDetected = false;
        while (!cursor.isComplete() && !externalEndingDetected) {
            var simpleNodes = cursor.collectStaticsThrough(['</', '<']);       // get any text up until the first open or close tag
            simpleNodes.forEach(n => nodes.push(n));    // add any plain text to the nodes output
            if (simpleNodes.terminator) {
                if (simpleNodes.terminator.string == '<') {    // internal tag beginning
                    var ele = compileElement(cursor);
                    nodes.push(ele);
                } else {
                    externalEndingDetected = true;
                    //cursor.collectStaticsThrough(['>'], true);
                }
            } 
        }

        return function(values) {
            return nodes.map(function(node) {
                if (typeof node == 'string')
                    return node;
                else if (node instanceof Function)
                    return node(values);
                else
                    return values[node];
            });
        };
    }


    //////////////////////////////////////////////////
    /////                Locations
    //////////////////////////////////////////////////
    
    function LinkedTree(parent) {
        this.parent = parent;
    }
    LinkedTree.prototype.appendChild = function(lt) {
        if (!lt)
            lt = new LinkedTree(this);
        else
            lt.parent = this;
        if (this.last)
            this.last.itemAfter = lt;
        lt.itemBefore = this.last;
        this.last = lt;
        if (!this.first)
            this.first = lt;
        
        return lt;
    };
    LinkedTree.prototype.insert = function() {
        var lt = new LinkedTree(this.parent);
        lt.itemBefore = this.itemBefore;
        lt.itemAfter = this;
        if (this.itemBefore)
            this.itemBefore.itemAfter = lt;
        this.itemBefore = lt;
        
        return lt;
    };
    LinkedTree.prototype.remove = function() {
        if (!this.parent) return;
        
        var itemBefore = this.itemBefore;
        var itemAfter = this.itemAfter;
        if (this.itemBefore)
            this.itemBefore.itemAfter = itemAfter;
        if (this.itemAfter)
            this.itemAfter.itemBefore = itemBefore;
        if (this.parent.first === this)
            this.parent.first = itemAfter;
        if (this.parent.last === this)
            this.parent.last = itemBefore;
        
        this.wasAfter = itemBefore;
        this.wasBefore = itemAfter;
        this.itemBefore = null;
        this.itemAfter = null;
    };
    LinkedTree.prototype.forEach = function(func, thiz) {
        var child = this.first;
        while (child) {
            var next = child.itemAfter;     // retrieve first in case func affects it
            func.call(thiz, child);
            child = next;
        }
    };
    

    function HtmlLocation(parent, host, before, namespace) {
        LinkedTree.call(this, parent);
        this.host = host;
        this.namespace = namespace;
        this.comesBefore = before;
        
        if (!before && !parent) {
            this.fallbackEnder = document.createComment('html location ender');
            this.host.appendChild(this.fallbackEnder);
        }
    }
    HtmlLocation.prototype = Object.create(LinkedTree.prototype);
    HtmlLocation.prototype.getFirstElement = function() {
        if (this.ele)
            return this.ele;
        var child = this.first;
        while (child) {
            if (child.host === this.host) {
                var fe = child.getFirstElement();
                if (fe)
                    return fe;
            } else
                throw Error('unexpected child host - cannot remove if statement');
            child = child.itemAfter;
        }
    };
    HtmlLocation.prototype.getElementAfter = function() {
        if (this.comesBefore)
            return this.comesBefore;
        var sibling = this.itemAfter;
        while (sibling) {
            if (sibling.host === this.host) {
                var fe = sibling.getFirstElement();
                if (fe)
                    return fe;
            } else
                throw Error('unexpected child host - cannot remove if statement');
            sibling = sibling.itemAfter;
        }
        if (this.parent && this.parent.host === this.host)
            return this.parent.getElementAfter();
        return this.fallbackEnder;
    };
    HtmlLocation.prototype.createChild = function(host, namespace) {
        var loc = new HtmlLocation(this, host, undefined, namespace); 
        this.appendChild(loc);
        return loc;
    };
    HtmlLocation.prototype.installChild = function(content, host, namespace) {
        var loc = this.createChild(host, namespace);
        loc.install(content);
        return loc;
    };
    HtmlLocation.prototype.install = function(obj) {      // installs the input item in this location
        this.clear();
        this.installedContent = obj;        // todo: remove - testing
        
        if (obj === undefined || obj === null) {
            // do nothing
        } else if (!(obj instanceof Object)) {
            this.ele = document.createTextNode(obj);
            this.host.insertBefore(this.ele, this.getElementAfter());
        } else if (obj instanceof Array) {
            obj.forEach(o => {
                this.installChild(o, this.host, this.namespace);
            });
        } else if (obj instanceof Bundle) {
            var chtml = getCompiledHtmlBundle(obj);
            chtml.forEach(o => {
                this.installChild(o, this.host, this.namespace);
            });
        } else if (obj instanceof CompiledHtmlElement) {
            var ns = this.namespace || obj.name === 'svg' ? 'http://www.w3.org/2000/svg' : undefined; 
            if (ns)
                this.ele = document.createElementNS(ns, obj.name);
            else
                this.ele = document.createElement(obj.name);
            if (obj.attributes) {
                var attrsLocation = new AttributeLocation(this.ele);
                attrsLocation.install(obj.attributes);
            }
            if (obj.contents) {
                this.installChild(obj.contents, this.ele, ns);
            }
            this.host.insertBefore(this.ele, this.getElementAfter());
        } else if (obj instanceof Element) { 
            var parent = obj.parentElement;
            if (parent)
                //throw Error('Cannot install an Element in multiple locations');
                parent.removeChild(obj);
            this.ele = obj;
            this.host.insertBefore(this.ele, this.getElementAfter());
        } else if (obj instanceof Function) {
            var subLocation = this.createChild(this.host, this.namespace);
            var val;
            var fUpdate = () => subLocation.install(val);
            this.updater = re.onChange(() => val = obj(this.host), fUpdate);
            fUpdate();
        } else {
            this.ele = document.createTextNode(obj.toString());
            this.host.insertBefore(this.ele, this.getElementAfter());
            console.log('Unexpected content type - using toString');
        }
        
        this.occupant = obj;
    };
    HtmlLocation.prototype.clear = function() {
        // stop update events from triggering
        if (this.updater)
            this.updater.cancel();
            
        // remove any child locations
        this.forEach(loc => 
            loc.remove()
        );
        
        // remove element if location is hosting a simple literal
        if (this.ele) {
            this.host.removeChild(this.ele);
            this.ele = null;
        } else if (this.installedContent)
            this.clearedAgain = true;
            
        if (this.hasBeenRemoved)
            throw Error('already removed');
    };
    HtmlLocation.prototype.remove = function() {        // removes the location from the dom, along with anything in it
        this.clear();
        LinkedTree.prototype.remove.call(this);
        this.hasBeenRemoved = true;
        if (this.fallbackEnder)
            this.host.removeChild(this.fallbackEnder);
    };
    

    function AttributeLocation2(host, prior, parent) {
        if (!(host instanceof Element))
            throw Error('Invalid location host');
            
        this.host = host;
        this.prior = prior;
        this.parent = parent;
    }
    AttributeLocation2.prototype.createChild = function() {
        if (!this.children)
            this.children = [];
        return new AttributeLocation2(this.host, this.children[this.children.length - 1], this);
    };
    AttributeLocation2.prototype.install = function(obj) {
        if (obj instanceof Array) {
            var previous;
            obj.installations = obj.map((item, i) => {
                var loc = new AttributeLocation2(this.host, previous, this);
                previous = item;
                return loc.install(item);
            });
        } else if (obj instanceof CompiledHtmlAttribute) {
            this.updater = re.onChange(() => {
                var name = obj.getName(this.host);
                if (name && name.length > 0) {
                    this.host.setAttribute(name, obj.getValue(this.host));
                    this.attributeName = name;
                }
            });
        } else if (obj instanceof Function) {
            var loc = new AttributeLocation2(this.host, null, this);
            loc.install(obj);
        }
    };
    AttributeLocation2.prototype.getAttributes = function() {
        var out;
        if (this.prior)
            out = this.prior.getAttributes();
        else
            out = {};
            
        return out;
    };


    function AttributeLocation(host, parent, index) {
        if (!(host instanceof Element))
            throw Error('Invalid location host');
            
        this.host = host;
        this.parent = parent;
        this.index = index;
    }
    AttributeLocation.prototype.createChild = function() {};
    AttributeLocation.prototype.clear = function() {};
    AttributeLocation.prototype.install = function(obj) {
        if (obj instanceof Array) {
            obj.forEach(o => {
                this.install(o);
            });
        } else if (obj instanceof Function) {
            //R(() => obj(this.host));          // todo: add cancellation, this is likely a memory leak
            this.updater = re.onChange(() => {
                var val = obj(this.host);
                this.install(val);
            });
            /*var subLocation = this;
            var val;
            var fUpdate = () => 
                subLocation.install(val);
            this.updater = re(() => 
                val = obj(this.host), fUpdate
            );
            fUpdate();*/
        } else if (obj instanceof CompiledHtmlAttribute) {
            this.updater = re.onChange(() => {
                var name = obj.getName(this.host);
                if (name && name.length > 0) 
                    this.host.setAttribute(name, obj.getValue(this.host));
            });
        } 
    };
    AttributeLocation.prototype.remove = function() {
        if (this.updater)
            this.updater.cancel();
    };


    //////////////////////////////////////////////////
    /////          Install / Remove
    //////////////////////////////////////////////////














    //////////////////////////////////////////////////
    /////           Installation Helper
    //////////////////////////////////////////////////

    function install(obj, host, before) {
        if (isString(host))
            host = document.getElementById(host);
            
        /*if (before instanceof HtmlLocation)
            before = before.beginMarker;*/
        var loc = new HtmlLocation(undefined, host, before);
        loc.install(obj);    
        
        return loc;
    }
    
    
    // attach outputs
    re.bundle = bundle
    re.install = install;
    this.bundle = bundle;
    this.install = install;

})();
