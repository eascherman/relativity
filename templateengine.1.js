
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
        
        /*var out;
        var ts = thisString();
        if (!ts)
            return undefined;
        if (charCursor < ts.length - 1) {
            out = ts[charCursor];
            charCursor++;
        } else {
            out = b.values[stringCursor];
            stringCursor++
            charCursor = 0;
        }
        return out;*/
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
    
    this.collectThrough1 = function(terminators, includeTerminators) {
        var out = [];
        
        for (var i=0 ; i<b.strings.length ; i++) {
            var obj = this.thisItem();
            for (var j=0 ; j<terminators.length ; j++) {
                var t = terminators[j];
                
            }
        }
        
        return out;
    };
    
    this.collectThrough = function(terminators, includeTerminator) {
        var rs = remainingStrings;
        if (includeTerminator === undefined)
            includeTerminator = false;
        var out = [];
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
    };
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
    
    //console.log('compiling attribute'); // cc:' + charCursor + ' sc:' + charCursor);
    //var attr = [];
    var attrName;
    var attrBounder;
    var attrValue;
    
    var tc = cursor.thisChar();
    while (tc == ' ' || tc == '\r' || tc == '\n') 
        tc = cursor.step();
    if (tc == '/' || tc == '>')
        return undefined;
    else if (tc instanceof Function) {
        attrName = tc;
        //attr.push(tc);
    } else {
        attrName = cursor.collectThrough(['=', ' ', '\r', '\n']);
        //attr.push(attrName);
        if (attrName.terminator && attrName.terminator.string == '=') {
            //attr.push('=');
            cursor.step();
            attrBounder = cursor.thisChar();
            if (attrBounder != '"' && attrBounder != "'")
                throw Error('Attribute values must be enclosed in " or \'');
            cursor.step();
            attrValue = cursor.collectThrough([attrBounder]);
            cursor.step();
            //attr.push([q, vValue, q]);
        }
    }
    
    //return new CompiledAttribute(attr);
    if (attrName instanceof Function && !attrBounder)        // todo: determine how to properly handle funcs here
        return attrName;
    else
        return new CompiledHtmlAttribute(attrName, attrValue, attrBounder);
}

function compileAttributes(cursor) {
    var attrs = [];
    
    var ca = true;
    while(ca) {
        ca = compileAttribute(cursor);
        if (ca) {
            attrs.push(ca);
        }
    }
    
    return attrs;
}

function CompiledHtmlElement(name, attributes, contents) {
    this.name = name;
    this.attributes = attributes;
    this.contents = contents;
}

function compileElement(cursor) {
    //console.log('compiling element');
    
    var tagStart = cursor.collectThrough(['>', '/>', ' ', '\n', '\r']);
    var tagName = tagStart[0].substring(1);
    var tagAttrs = compileAttributes(cursor);
    var tagEnding = cursor.collectThrough(['>', '/>'], true);
    if (tagEnding.terminator.string == '/>') {
        //charCursor += 2;
        //cursor.step();
        //cursor.step();
        //return new CompiledElement(tagName, tagAttrs, []);
        return new CompiledHtmlElement(tagName, tagAttrs);
    }  else {
        //charCursor += 1;
        //cursor.step();
        var innards = compileHtml(cursor);
        cursor.collectThrough(['>'], true);
        //return new CompiledElement(tagName, tagAttrs, innards);
        return new CompiledHtmlElement(tagName, tagAttrs, innards);
    }
}

function getCompiledHtmlBundle(b) {         // todo: create cacheing 
    
    var cursor = new Cursor(b);
    return compileHtml(cursor);
}

function compileHtml(cursor) {
    if (!cursor.isComplete)
        throw Error('invalid cursor');
        
    var nodes = [];

    while (!cursor.isComplete()) {
        var simpleNodes = cursor.collectThrough(['</', '<']);       // get any text up until the first open or close tag
        simpleNodes.forEach(n => nodes.push(n));    // add any plain text to the nodes output
        if (!simpleNodes.terminator)
            return nodes;
        if (simpleNodes.terminator.string == '<') {    // inernal tag beginning
            var ele = compileElement(cursor);
            nodes.push(ele);
        } else if (simpleNodes.terminator.string == '</') {     // tag ending
            return nodes;     // return once the host's end tag is found
        }
    }

    return nodes;     // fallback return for when there is no host tag
}


//////////////////////////////////////////////////
/////                Locations
//////////////////////////////////////////////////

function HtmlLocation(host, before) {
    if (!(host instanceof HTMLElement))
        throw Error('Invalid html location host');
    this.children = [];
    
    this.host = host;
    
    // mark the bounds of the location with comments
    var pc = placeholderCounter++;
    this.beginMarker = document.createComment('beginning of html location ' + pc);
    this.endMarker = document.createComment('end of html location ' + pc);
    if (before) {
        host.insertBefore(this.beginMarker, before);
        host.insertBefore(this.endMarker, before);
    } else {
        host.appendChild(this.beginMarker);
        host.appendChild(this.endMarker);
    }
}
HtmlLocation.prototype.createChild = function() {       // creates a child location at the end of this one
    var out = new HtmlLocation(this.host, this.endMarker);
    this.children.push(out);
    return out;
};
HtmlLocation.prototype.clear = function() {     // removes everything that has been installed in this location
    // remove any child locations
    this.children.forEach(loc => loc.remove());
    this.children = [];
    
    // remove element if location is hosting a simple literal
    if (this.ele) {
        this.host.removeChild(this.ele);
        this.ele = null;
    }
    
    if (this.updater)
        this.updater.cancel();
};
HtmlLocation.prototype.install = function(obj) {      // installs the input item in this location
    this.clear();
    
    if (!(obj instanceof Object)) {
        this.ele = document.createTextNode(obj);
        this.host.insertBefore(this.ele, this.endMarker);
    } else if (obj instanceof Array) {
        obj.forEach(o => {
            var subLocation = this.createChild();
            subLocation.install(o);
        });
    } else if (obj instanceof Bundle) {
        var chtml = getCompiledHtmlBundle(obj);
        chtml.forEach(o => {
            var subLocation = this.createChild();
            subLocation.install(o);
            ///this.children.push(subLocation);   // todo: add to this.children?
        });
    } else if (obj instanceof CompiledHtmlElement) {
        this.ele = document.createElement(obj.name);
        if (obj.attributes) {
            var attrsLocation = new AttributeLocation(this.ele);
            attrsLocation.install(obj.attributes);
        }
        if (obj.contents) {
            var subLocation = new HtmlLocation(this.ele);
            subLocation.install(obj.contents);
        }
        this.host.insertBefore(this.ele, this.endMarker);
    } else if (obj instanceof Function) {
        var subLocation = this.createChild();
        var val;
        var fUpdate = () => subLocation.install(val);
        this.updater = R(() => val = obj(this.host), fUpdate);
        fUpdate();
    } else {
        this.ele = document.createTextNode(obj.toString());
        this.host.insertBefore(this.ele, this.endMarker);
        console.log('Unexpected html element type - using toString');
    }
    
    this.occupant = obj;
};
HtmlLocation.prototype.remove = function() {        // removes the location from the dom, along with anything in it
    this.clear();
    this.host.removeChild(this.beginMarker);
    this.host.removeChild(this.endMarker);
};





function AttributeLocation(host, parent, index) {
    if (!(host instanceof HTMLElement))
        throw Error('Invalid html location host');
        
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
        var subLocation = this;//this.createChild();
        var val;
        var fUpdate = () => subLocation.install(val);
        this.updater = R(() => val = obj(this.host), fUpdate);
        fUpdate();
    } else if (obj instanceof CompiledHtmlAttribute) {
        this.updater = R(() => {
            var name = obj.getName(this.host);
            if (name && name.length > 0)
                this.host.setAttribute(obj.getName(this.host), obj.getValue(this.host))
        });
    } 
};
AttributeLocation.prototype.remove = function() {};


//////////////////////////////////////////////////
/////          Install / Remove
//////////////////////////////////////////////////















//////////////////////////////////////////////////
/////           Installation Helper
//////////////////////////////////////////////////

function install(obj, host) {
    if (isString(host))
        host = document.getElementById(host);
        
    var loc = new HtmlLocation(host);
    loc.install(obj);    
}
