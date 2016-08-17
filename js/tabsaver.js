"use strict";


/*
 * Array
 */

/** [exists] takes a predicat [p] and returns true if there is at least one
    element satisfies [p]. */
Array.prototype.exists = function(predicat) {
    for (var i = 0; i < this.length; i++) {
        if (predicat(this[i])) return true;
    }
    return false;
}

/** [upush] takes an element [e] and a predicat [p] and add [e] if no existing
    element satisfies [p]. */
Array.prototype.upush = function(element, predicat) {
    if (!this.exists(predicat)) {
        this.push(element);
    }
}

/** [filter] creates an array with every elemet satisfying [predicat]. */
Array.prototype.filter = function(predicat) {
    var result = [];
    for (var i = 0; i < this.length; i++) {
        if (predicat(this[i]))
            result.push(this[i]);
    }
    return result;
}


/*
 * Document
 */

/** [Document] gives shortcuts to work with the DOM. */
var Document = {

    /** [onClick] add a click event of a DOM element with id [id] giving
        the [callback]. */
    onClick: function(id, callback) {
        var element = document.getElementById(id);
        element.addEventListener("click", callback);
    },

    /** [clear] remove every child of [node]. */
    clear: function(node) {
        while(node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

}



/*
 * Saver
 */
var Saver = {

    /** [result] show the box with class [cl], with the message [msg] if
        it was given. If [msg] is not defined, then the inner text of the
        element is left as is. */
    result: function(cl, msg) {
        var e = document.getElementsByClassName(cl)[0];
        if (msg !== undefined && msg !== null)
            e.innerText = msg;
        e.style.display = "block";
        window.setTimeout(function() { e.style.display = "none"; }, 1300);
    },

    /** [input] read the input given by the user, removes trailing spaces
        and returns its value. */
    input: function() {
        var id = document.getElementById('id');
        var txt = id.value.replace(/^\s+|\s+$/g, '');

        if (txt.length > 63) {
            Saver.result("error", "Identifier must have length < 64.");
        } else if (txt === "") {
            Saver.result("error", "Identifier field is empty.");
        } else {
            id.value = "";
            return txt;
        }

        return null;
    },

    /** [urls] takes an array of [chrome.tabs], and returns only urls. */
    urls: function(tabs) {
        return tabs.filter(function(tab) { return !tab.incognito; })
                   .map(function(tab) { return tab.url; });
    },

    /** [storeUrls] store the array of urls into the chrome synchronized
        storage. */
    storeUrls: function(id, urls) {
        var obj = {};
        obj[id] = urls;
        chrome.storage.sync.set(obj);
    },

    /** [storeIdentifier] store the new used identifier.
        If the identifier is alredy used, then it's erased by the new one. */
    storeIdentifier: function(identifier) {
        chrome.storage.sync.get("tabsaver.identifiers", function(items) {
            var ids = items["tabsaver.identifiers"];
            if (ids === undefined) {
                ids = [identifier];
            } else {
                ids.upush(identifier, function(element) {
                    return element === identifier
                });
            }
            chrome.storage.sync.set({ "tabsaver.identifiers" : ids});
        });
    },

    /** [save] take the tabs array and store it to the chrome synchronized's
        storage. */
    save: function(tabs) {
        chrome.tabs.getAllInWindow(null, function(tabs) {
            var identifier = Saver.input();
            if (identifier === null) return;
            var urls = Saver.urls(tabs);
            if (urls.length == 0) return;
            Saver.storeUrls(identifier, urls);
            Saver.storeIdentifier(identifier);
            UI.show();
            Saver.result("success");
        });
    }

}



/** [Deleter] contains necessary functions to data deletion. */
var Deleter = {

    /** [removeIdentifier] remove the given [id] from the array of
        saved identifiers. */
    removeIdentifier: function(id) {
        chrome.storage.sync.get("tabsaver.identifiers", function(items) {
            var ids = items["tabsaver.identifiers"];
            if (ids === undefined) return;
            ids = ids.filter(function (i) { return i !== id; });
            chrome.storage.sync.set({ "tabsaver.identifiers" : ids });
        });
    },

    /** [delete] removes the data with identifier [id]. */
    delete: function(id) {
        return function() {
            Deleter.removeIdentifier(id);
            chrome.storage.sync.remove(id);
            UI.show();
        }
    }

}



/*
 * UI
 */

/** [UI] is contains every functions for the plugin user interface.
    It's mainly used to populate the 'Load' tab. */
var UI = {

    /** Create a 'Load' element, containing every informations needed to
        load the set of tabs. */
    element: function(id, ul) {
        var li = document.createElement("li");
        var div = document.createElement("div")
        var a = document.createElement("a");
        a.setAttribute("href", "#");
        a.setAttribute("id", id);
        a.innerText = id;

        var deleteid = "del-" + id;
        var del = document.createElement("span")
        del.setAttribute("id", deleteid);
        del.setAttribute("class", "delete-button");
        del.innerText = "X";

        div.appendChild(a);
        div.appendChild(del);
        li.appendChild(div);
        ul.appendChild(li);
        Document.onClick(id, Loader.load(id));
        Document.onClick(deleteid, Deleter.delete(id));
    },

    /** [onChanged] is the callback used when an element change into the
        synchronized namespace. */
    onChanged: function(changes, namespace) {
        if (namespace === "sync") {
            var ids = changes["tabsaver.identifiers"];
            if (ids === undefined) return;
            UI.show();
        }
    },

    /** [show] display every saved elements into the 'Load' tab. */
    show: function() {
        chrome.storage.sync.get("tabsaver.identifiers", function(items) {
            var ids = items["tabsaver.identifiers"];
            if (ids === undefined) return;
            var ul = document.getElementById("existing-identifiers");
            Document.clear(ul);
            for (var i = 0; i < ids.length; i++) {
                UI.element(ids[i], ul);
            }
        })
    }

}



/*
 * Loader
 */

/** [Loader] contains every function to load a saved tab collection. */
var Loader = {

    /** [load] create a new chrome windows containing with every tabs
        associated to [identifier]. */
    load: function(identifier) {
        return function() {
            chrome.storage.sync.get(identifier, function(items) {
                var urls = items[identifier];
                if (urls === undefined) return;
                chrome.windows.create({ "url": urls, "focused": true });
            })
        }
    }

}



/*
 * TabSaver
 */

/** [TabSaver] is the main object of the plugin.
    It loads every necessary elements before the plugin's usage.. */
var TabSaver = {

    /** [init] initialize the TabSaver plugin by adding every listeners and
        showing every HTML elements. */
    init: function(e) {
        Document.onClick('save_button', Saver.save);
        UI.show();
        chrome.storage.onChanged.addListener(UI.onChanged);
    }

}



/*
 * Main part
 */

window.onload = TabSaver.init;
