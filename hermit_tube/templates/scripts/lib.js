function clearObject(obj) {
    Object.keys(obj).forEach(function(key) { delete obj[key]; });
}

function shallowEqualObjects(obj1, obj2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
  
    if (keys1.length !== keys2.length) {
        return false;
    }
  
    for (let key of keys1) {
        if (obj1[key] !== obj2[key]) {
            return false;
        }
    }
  
    return true;
}
  

function makeRequest({method='GET', url='', headers={}, params='', creds=false,
                      json=false, arraybuffer=false} = {}) {
    // https://stackoverflow.com/a/30008115/4001895
    return new Promise((res, rej) => {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url);
        xhr.onload = function() {
            if (this.status >=200 && this.status < 300) {
                if (json) {
                    res(JSON.parse(xhr.responseText));
                } else if (arraybuffer) {
                    res(xhr.response);
                } else {
                    res(xhr.responseText);
                }
            } else {
                rej({status: this.status, statusText: this.statusText});
            }
        }
        xhr.onerror = function () {
            rej({status: this.status, statusText: xhr.statusText});
        };
        if (arraybuffer) {
            xhr.responseType = 'arraybuffer';
        }
        if (headers) {
            for (const [key, val] of Object.entries(headers)) {
                xhr.setRequestHeader(key, val);
            }
        }
        if (creds) {
            xhr.withCredentials = true;
        }
        // We'll need to stringify if we've been given an object
        // If we have a string, this is skipped.
        if (params && typeof params === 'object') {
            params = Object.keys(params).map(function (key) {
                return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
            }).join('&');
        }
        xhr.send(params);
    });  
}

/**
 * Element Creation convenience function. Should be fast.
 * @param {String} tagName 
 * @param {Object} properties 
 * @param  {...Element} children 
 */
 function makeElement(tagName, properties, ...children) {
    let el = document.createElement(tagName);
    Object.keys(properties).forEach((k) => {
        if (['innerText', 'innerHTML'].includes(k)) {
            el[k] = properties[k];
        } else if (['click', 'mouseenter', 'mouseleave'].includes(k)) {
            el.addEventListener(k, properties[k]);
        } else {
            el.setAttribute(k, properties[k]);
        }
    });

    children.forEach(child => {
        el.appendChild(child)
    });
    return el;
}

function logJson(obj) {
    console.log(JSON.stringify(obj, null, 2));
}