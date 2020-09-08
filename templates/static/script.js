const MONTHS = [
    "January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"
];

// Selected channels and scroll posstion by series (added channels are hidden)
var STATE = {}

// scroll tracker timeout timer, to prevent hundreds of actions per scroll
var scrollTimeout = null
// scroll to epoch data structure.
var scrollToEpoch = []

window.onload = function () {
    if (document.getElementById('loading') === null) {
        return;
    }
    STATE = loadFromStorage('state');
    if (STATE === null) {
        STATE = {};
        stateToStorage('state', STATE);
    }
    window.addEventListener('scroll', function(e) {
        if (scrollTimeout !== null) {
            window.clearTimeout(scrollTimeout)
        }
        var pos = window.scrollY;
        scrollTimeout = window.setTimeout(function() {
            STATE[window.series].scroll = getScrollPos(pos);
            console.log(`scrolled to ${STATE[window.series].scroll} (${pos})`);
            stateToStorage('state', STATE);
        }, 300);
    });
      
    initDropdown()
    loadSeries();
}

/**
 * Initialize series selector dropdown.
 */
function initDropdown() {
    let dropdown = document.getElementById('seasons');
    window.all_series.forEach((s) => {
        let li = document.createElement('li');
        let link = document.createElement('a');
        link.setAttribute('href', '#');
        link.setAttribute('data-series', s[0]);
        link.innerText = s[1]
        li.appendChild(link);
        dropdown.appendChild(li);
        link.onclick = function() {
            clearSeries();
            stateToStorage('series', this.getAttribute('data-series'));
            loadSeries();
            return false;
        };
    });
}

/**
 * Wrapper for localStorage.setItem.
 * 
 * @param {str} key 
 * @param {object} val 
 */
function stateToStorage(key, val) {
    try {
        localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
        console.log(e);
        return false;
    }
    localStorage.getItem(key);
}

/**
 * Wrapper for localStorage.getItem.
 * 
 * @param {str} key 
 */
function loadFromStorage(key) {
    try {
        val = localStorage.getItem(key);
        if (val === null) {
            return null;
        }
        return JSON.parse(val);
    } catch (e) {
        console.log(e)
        return null;
    }
}

/**
 * Loads a series from the server.
 */
function loadSeries() {
    let series = loadFromStorage('series');
    if (series === null) {
        series = window.series;
    } else {
        window.series = series;
    }
    console.log('Loading', series);
    if (!(series in STATE)) {
        STATE[series] = {'channels': [], 'scroll': 0};
        stateToStorage('state', STATE);
    }

    var req = new XMLHttpRequest();
    req.overrideMimeType("application/json");
    req.open('GET', '/data/' + series + '.json', true);
    req.onreadystatechange = function () {
        if (req.readyState == 4) {
            if (req.status == "200") {
                renderSeries(req.responseText);
            } else {
                console.log('Error during request:', req);
            }
        }
    };
    req.send();
}

/**
 * Given a channel ID, shows or hides all videos from that channel.
 * 
 * @param {str} ch_id 
 * @param {bool} visible 
 */
function toggleVideos(ch_id, visible) {
    let vids = document.getElementsByClassName(`channel_${ch_id}`);
    for (let i=0; i<vids.length; i++) {
        vids[i].style.display = (visible ? 'block' : 'none');
    }
}

/**
 * Checkbox onchange event handler, shows or hides videos based on check.
 * 
 * @param {Event} e 
 */
function toggleChannel(e) {
    let ch_id = e.target.getAttribute('data-channel');
    let visible = e.target.checked;
    toggleVideos(ch_id, visible);
    let index = STATE[window.series].channels.indexOf(ch_id);
    if (visible && index != -1) {
        STATE[window.series].channels.splice(index, 1);
    } else if (!visible && index == -1) {
        STATE[window.series].channels.push(ch_id);
    }
    updateScrollPos();
    stateToStorage('state', STATE);
}

/**
 * Resets the content window to load a different series.
 */
function clearSeries() {
    document.querySelectorAll('#videos, #channels').forEach((el) => {
        el.parentElement.removeChild(el);
    });
    document.getElementById('loading').style.display = 'block';
}

/**
 * Parses a server response for a series and displays it.
 * 
 * @param {str} data JSON server response payload
 */
function renderSeries(data) {
    document.getElementById('loading').style.display = 'none';
    var series = JSON.parse(data);
    var content = document.getElementById('content');

    var channels = document.createElement('div');
    channels.setAttribute('id', 'channels');
    content.appendChild(channels);

    let channel_list = {};
    series.channels.forEach((ch) => {channel_list[ch.name] = ch.t});

    Object.keys(channel_list).sort().forEach(function(key) {
        channels.appendChild(renderChannelCheckbox(
            key, channel_list[key]));
    });

    var videos = document.createElement('div');
    videos.setAttribute('id', 'videos');
    content.appendChild(videos);

    document.querySelectorAll('#channels input')
    prevDate = '';
    for (let i=0; i<series.videos.length; i++) {
        let vid = series.videos[i];
        if (vid.t === null) {
            continue;
        }
        let d = new Date(0);
        d.setUTCSeconds(vid.ts);
        dateText = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
        if (prevDate != dateText) {
            let dateEl = document.createElement('h2');
            dateEl.innerText = dateText;
            videos.appendChild(dateEl);
            prevDate = dateText;
        }

        videos.appendChild(renderVideo(vid, series.channels[vid.ch]));
    }
    
    STATE[window.series].channels.forEach((ch_id) => {
        toggleVideos(ch_id, false);
    });

    updateTimeline();
    let offsetY = setScrollPos();
    console.log('scrolling to: ', offsetY);
    window.scrollTo(0, offsetY);
    lazyload();
    loadDescriptions();
}

/**
 * String to HTML Element convenience function.
 * 
 * @param {str} html 
 */
function htmlToElement(html) {
    var template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

/**
 * Renders a channel checkbox. All channel values are from the config so
 * HTML-injection safe.
 * 
 * @param {str} id 
 * @param {str} title 
 */
function renderChannelCheckbox(id, title) {
    let ch_p = document.createElement('p');
    let checked = (
        (STATE[window.series].channels.indexOf(id) == -1)
        ? 'checked="checked"' : '');
    let input = document.createElement('input');
    ch_p.innerHTML = `
        <input type='checkbox' ${checked} id='channel_${id}'
            data-channel='${id}' />
        <label for='channel_${id}'>${title}</label>
    `.trim();
    ch_p.firstChild.onchange = toggleChannel;
    return ch_p;
}

/**
 * Renders a video as an HTML Elment. Content generated by YouTube is safe,
 * but any content from the channel should be escaped.
 * 
 * @param {Object} vid 
 * @param {Object} ch 
 */
function renderVideo(vid, ch) {
    vidEl = document.createElement('div');
    vidEl.classList.add('video');
    vidEl.classList.add(`channel_${ch['name']}`);
    vidEl.setAttribute('data-timestamp', vid.ts);
    vidEl.setAttribute('data-video-id', vid.id);

    let vidURL = `https://www.youtube.com/watch?v=${vid.id}`;
    let chURL = `https://www.youtube.com/channel/${ch.id}`;

    let thumbLink = htmlToElement(`<a href='${vidURL}' target='_blank'></a>`);
    vidEl.appendChild(thumbLink);
    let thumb = htmlToElement(`
        <img
            data-src='https://i.ytimg.com/vi/${vid.id}/mqdefault.jpg'
            class="lazyload thumb" width='320' height='180' />`)
    thumb.setAttribute('alt', vid.t);
    thumb.setAttribute('title', vid.t);
    thumbLink.appendChild(thumb);

    let title = htmlToElement(`
        <h3>
            <a href='${chURL}' target='_blank'>
                <img data-src='${ch.thumb}' width='44' height='44'
                    title='${ch.t}' alt='${ch.t}'
                    class="lazyload" />
            </a>
        </h3>
    `);
    let vidLink = htmlToElement(`<a href='${vidURL}' target='_blank'></a>`)
    vidLink.innerText = vid.t;
    title.appendChild(vidLink);
    title.appendChild(document.createElement('br'));
    title.appendChild(htmlToElement(`
        <a href='${chURL}' target='_blank' title='${ch.t} channel'
            class='channel_link'>${ch.t}</a>
    `))
    vidEl.appendChild(title);

    return vidEl;
}

/**
 * Converts scroll to timestamp.
 * 
 * @param {int} pos window.scrollY value
 */
function getScrollPos(pos) {
    // Converts scroll position to timestamp
    if (pos == 0) {
        return 0;
    }
    for (var i=0; i<scrollToEpoch.length; i++) {
        let current = scrollToEpoch[i];
        if (current.pos < pos) continue;
        if (i == 0) return 0;

        let prev = scrollToEpoch[i-1];
        let offset = (pos - prev.pos) / (current.pos - prev.pos);
        return offset * (current.ts - prev.ts) + prev.ts;
    }
    return scrollToEpoch[scrollToEpoch.length-1].ts;
}

/**
 * Converts stored timestamp to scroll position.
 */
function setScrollPos() {
    let ts = STATE[window.series].scroll;
    for (var i=0; i<scrollToEpoch.length; i++) {
        var current = scrollToEpoch[i];
        if (current.ts < ts) continue;
        if (i == 0) return  0;

        let prev = scrollToEpoch[i-1];
        let offset = (ts - prev.ts) / (current.ts - prev.ts);
        return offset * (current.pos - prev.pos) + prev.pos;
    }
    return current.pos;
}

/**
 * Recalculates the timeline and updates scroll position.
 */
function updateScrollPos() {
    updateTimeline();
    setScrollPos();
}

/**
 * Updates the global scrollToEpoch.
 */
function updateTimeline() {
    var offset = document.body.getBoundingClientRect().top;
    scrollToEpoch.length = 0;
    var els = document.getElementsByClassName('video');
    for (var i=0; i<els.length; i++) {
        el = els[i];
        if (el.style.display == 'none') {
            continue;
        }
        scrollToEpoch.push({
            'ts': parseInt(el.getAttribute('data-timestamp')),
            'pos': el.getBoundingClientRect().top - offset
        });
    }
    console.log('updateTimeLine:', scrollToEpoch.length)
}

function loadDescriptions() {
    var req = new XMLHttpRequest();
    req.overrideMimeType("application/json");
    req.open('GET', '/data/' + series + '.desc.json', true);
    req.onreadystatechange = function () {
        if (req.readyState == 4) {
            if (req.status == "200") {
                renderDescriptions(req.responseText);
            } else {
                console.log('Error during request:', req);
            }
        }
    };
    req.send();
}

function renderDescriptions(jsonText) {
    let descs = JSON.parse(jsonText);   
    let videos = document.getElementsByClassName('video');
    for (var i=0; i<videos.length; i++) {
        let vid = videos[i];
        let desc = descs[vid.getAttribute('data-video-id')]

        para = document.createElement('p');
        desc.split(/(?:\r\n|\r|\n)/).forEach((text) => {
            // there are so many problems with this, but its good enough.
            // probably...
            text.split(/(https?:\/\/[^\s]+)/).forEach((part) => {
                if (part.startsWith('http')) {
                    let link = htmlToElement(`<a href="${part}">${part}</a>`);
                    para.appendChild(link);
                } else {
                    para.appendChild(document.createTextNode(part));
                }
            })
            para.appendChild(document.createElement('br'));
        });
        while (para.lastChild.nodeName.toLowerCase() == 'br') {
            para.removeChild(para.lastChild);
        }
        vid.appendChild(para);
    }
}
