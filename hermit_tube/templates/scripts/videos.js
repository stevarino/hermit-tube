/**
 * Loads a series from the server.
 */
 function loadSeries() {
    let series = getSeries();
    console.log('Loading', series);
    createSeries(series);

    if (USER.UPDATE_TIMER !== 0) {
        clearInterval(USER.UPDATE_TIMER);
    }
    USER.UPDATE_TIMER = setInterval(fetchUpdate, 300000); // 5 minutes
    requestSeries(series);
    
}

/**
 * Resets the content window to load a different series.
 */
function clearSeries() {
    document.querySelectorAll('#videos, #channels > *').forEach((el) => {
        el.parentElement.removeChild(el);
    });
    document.getElementById('loading').style.display = 'block';
}

/**
 * Request series payload, calling a callback on the response JSON.
 * 
 * @param {function} callback 
 */
function requestSeries(series) {
    let d = new Date(0).getTime();
    makeRequest({
        url: `/data/${series}/${series}.json?d=${d}`,
        json: true,
    }).then((series) => {
        document.getElementById('loading').style.display = 'none';
        var content = document.getElementById('content');
        clearObject(ELEMENT_BY_VIDEO_ID);
    
        initChannels(series.channels);
        renderChannels(series.channels);
    
        var videos = document.createElement('div');
        videos.setAttribute('id', 'videos');
        content.appendChild(videos);
    
        for (let i = 0; i < series.videos.length; i++) {
            renderVideo(videos, series.videos[i]);
        }
        updateScrollPos();
        lazyload();
        loadDescriptions(series.descriptions);
    });
}



/**
 * Renders the Channel Selection checkboxes and sets the global cache.
 * 
 * @param {Array} seriesChannels The series channels
 */
 function initChannels(seriesChannels) {
    clearObject(CHANNELS_BY_NAME);
    clearObject(CHANNELS_BY_INDEX);
    for (const [key, val] of Object.entries(seriesChannels)) {
        val.index = key;
        CHANNELS_BY_NAME[val.name] = val;
        CHANNELS_BY_INDEX[key] = val;
    }
    getActiveChannels();
}

/**
 * Renders the Channel Selection checkboxes and sets the global cache.
 * 
 * @param {Array} seriesChannels The series channels
 */
function renderChannels(seriesChannels) {
    var channels = document.getElementById('channels');

    let selectall = makeElement('span', {}, makeElement('a', {
            href: '#',
            id: 'selectall',
            innerText: 'Select All',
            click: function (e) {
                document.querySelectorAll('#channels input').forEach((el) => {
                    el.checked = true;
                    toggleChannel({ target: el });
                });
                e.preventDefault();
            },
        }));

    let selectnone = makeElement('span', {}, makeElement('a', {
        href: '#',
        id: 'selectnone',
        innerText: 'Clear Selection',
        click: function (e) {
            document.querySelectorAll('#channels input').forEach((el) => {
                el.checked = false;
                toggleChannel({ target: el })
            });
            e.preventDefault();
        }
    }));
    channels.appendChild(makeElement('li', {}, selectall));
    channels.appendChild(makeElement('li', {}, selectnone));

    Object.keys(CHANNELS_BY_NAME).sort().forEach(function(key) {
        channels.appendChild(renderChannelCheckbox(key, CHANNELS_BY_NAME[key]));
    });
}


/**
 * Renders a channel checkbox. All channel values are from the config so
 * HTML-injection safe.
 * 
 * @param {str} ch_name 
 * @param {str} title 
 */
function renderChannelCheckbox(ch_name, data) {
    let root = document.createElement('li');
    let label = makeElement('label', {for: `channel_${ch_name}`});
    root.appendChild(label);
    let input = makeElement('input', {
        type: 'checkbox',
        id: `channel_${ch_name}`,
        'data-channel': ch_name,
    });
    if (CHANNELS_BY_NAME[ch_name].active) {
        input.setAttribute('checked', 'checked')
        root.classList.add('checked');
    }
    label.appendChild(input);

    label.appendChild(makeElement('img', {
        src: data.thumb,
        width: '44',
        height: '44',
        alt: `${data.title}'s Logo`,
    }));

    label.appendChild(document.createTextNode(data.t));
    input.addEventListener('change', toggleChannel);
    return root;
}


/**
 * Renders a date header if it has not been rendered yet.
 * 
 * @param {HTMLElement} videos 
 * @param {Object} vid 
 */
function renderDate(videos, vid) {
    let d = new Date(0);
    d.setUTCSeconds(vid.ts);
    let dateId = `date_${d.getFullYear()}${d.getMonth()}`;
    if (document.getElementById(dateId) === null) {
        videos.appendChild(makeElement('h2', {
            id: dateId,
            innerText: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
        }));
    }
}

/**
 * Renders a video as an HTML Elment. Content generated by YouTube is safe,
 * but any content from the channel should be escaped.
 * 
 * @param {Object} vid 
 * @param {Object} ch 
 */
function renderVideo(videos, vid) {
    renderDate(videos, vid);
    let ch = CHANNELS_BY_INDEX[vid.ch];
    if (ch === undefined) {
        console.error(`channel not found: ${vid.ch}`)
    }

    let vidURL = `https://www.youtube.com/watch?v=${vid.id}`;
    let chURL = `https://www.youtube.com/channel/${ch.id}`;
    
    let d = new Date(0);
    d.setUTCSeconds(vid.ts);
    let month = MONTHS[d.getMonth()].substr(0, 3);

    let vidEl = makeElement('div', {
        class: `video channel_${ch.name}`,
        mouseenter: videoShowMoreLess,
        mouseleave: videoHideMoreLess,
        'data-timestamp': vid.ts,
        'data-video-id': vid.id,
        'data-channel': ch.name,
    });

    vidEl.appendChild(makeElement('h3', {},
        makeElement('a', {href: chURL, class: 'vid_ch_logo'},
            makeElement('img', {
                src: ch.thumb,
                title: ch.t,
                alt: ch.t,
                target: '_blank',
            })
        ), 
        makeElement('span', {class: 'vid_desc'},
            makeElement('a', {
                class: 'vid_link',
                href: vidURL, 
                target: '_blank',
                'data-video-id': vid.id,
                innerText: vid.t,
                click: loadPlayer,
            }),
            document.createElement('br'),
            makeElement('a', {
                href: chURL,
                target: '_blank',
                title: ch.t + ' channel',
                class: 'channel_link',
                innerText: ch.t,
            }),
            makeElement('span', {
                class: 'date',
                innerText: `${month} ${d.getDate()} ${d.getFullYear()}`
            })
        ),
        makeElement('a', {
            href: `${chURL}?sub_confirmation=1`,
            target: '_blank',
            class: 'channel_subscribe',
            innerText: 'Subscribe'
        }),
    ));

    vidEl.appendChild(makeElement(
        'a', {
            href: vidURL,
            target: '_blank',
            'data-video-id': vid.id,
            click: loadPlayer,
        }, makeElement('img', {
            'data-src': `https://i.ytimg.com/vi/${vid.id}/mqdefault.jpg`,
            class: 'lazyload thumb',
            width: '320',
            height: '180',
            alt: vid.t,
            title: vid.t,
        })
    ));

    // TODO: Cache this somewhere
    if (!ch.active) {
        vidEl.style.display = 'none'
    }

    videos.appendChild(vidEl);

    if (vid.hasOwnProperty('d')) {
        vidEl.appendChild(renderDescription(vid.d));
    }
    ELEMENT_BY_VIDEO_ID[vid.id] = vidEl;
}

function videoShowMoreLess(e) {
    let vid = e.target;
    let rect = vid.getBoundingClientRect();
    let para = vid.lastChild;
    if (para.tagName.toLowerCase() != 'p') {
        return;
    }
    let paraRect = para.getBoundingClientRect();
    let text = vid.classList.contains('expanded') ? 'Less' : 'More';

    let show = makeElement('span', {
        class: "showmoreless",
        innerText: `Show ${text}`
    });
    show.addEventListener('click', videoExpand);
    vid.appendChild(show);
}

function videoHideMoreLess(e) {
    let vid = e.target;
    let span = vid.getElementsByClassName('showmoreless');
    if (span.length == 0) {
        return;
    }
    vid.removeChild(span[0]);
}

function videoExpand(e) {
    var vid = e.target.parentElement;
    vid.classList.toggle('expanded');
    updateScrollPos();
    let text = vid.classList.contains('expanded') ? 'Less' : 'More';
    let span = vid.getElementsByClassName('showmoreless');
    if (span.length == 0) {
        return;
    }
    span[0].innerText = 'Show ' + text;
}


/**
 * Asynchronously load video descriptions. This saves >90% of playlist loading
 * latency.
 */
 function loadDescriptions(hashes) {
    if (hashes !== undefined) {
        fetchDescriptionsByHash(hashes)
    } else {
        getDescriptions(0, new Date().getTime());
    }
}

function fetchDescriptionsByHash(hashes) {
    if (hashes.length == 0) {
        return;
    }
    let hash = hashes.shift();
    // req.responseType = 'arraybuffer';
    makeRequest({
        url: `/data/${getSeries()}/desc/${hash}.json.gz`,
        arraybuffer: true,
    }).then((res)=> {
        renderDescriptionObject(JSON.parse(
            pako.inflate(res, { to: 'string' })
        ));
        fetchDescriptionsByHash(hashes)
    });
}

function getDescriptions(i, d) {
    makeRequest({
        url: `/data/${getSeries()}/desc/${i}.json?${d}`,
        json: true,
    }).then((response) => {
        renderDescriptions(i, d, response);
    }).catch((err) => {
        console.log('Error during request:', err);
    });
}

/**
 * Receives an XMLHttpRequest payload and loads the data into the appropriate
 * video descriptions.
 * @param {str} jsonText 
 */
function renderDescriptions(i, d, jsonText) {
    let descs = JSON.parse(jsonText);
    renderDescriptionObject(descs.videos);
    if (descs.done == 0) {
        getDescriptions(i + 1, d);
    } else {
        let diff = new Date().getTime() - d;
        console.log(`Completed loading descriptions in ${diff}`)
    }
}

function renderDescriptionObject(descSet) {
    for (const [vid_id, desc] of Object.entries(descSet)) {
        // let vid = document.querySelector(`.video[data-video-id="${vid_id}"]`);
        let vid = ELEMENT_BY_VIDEO_ID[vid_id];
        if (vid === null) {
            console.error(`Unrecognized video id ${vid_id} (${i})`);
            continue;
        }
        vid.appendChild(renderDescription(desc));
    }
}

function renderDescription(desc) {
    para = document.createElement('p');
    desc.split(/(?:\r\n|\r|\n)/).forEach((text) => {
        // there are so many problems with this, but its good enough.
        // probably...
        text.split(/(https?:\/\/[^\s]+)/).forEach((part) => {
            if (part.startsWith('http')) {
                let link = makeElement('a', {
                    href: part,
                    innerText: part
                });
                para.appendChild(link);
            } else {
                para.appendChild(document.createTextNode(part));
            }
        })
        para.appendChild(document.createElement('br'));
    });
    return para;
}

/**
 * Given a video id, finds the next video id for the user's selected channels.
 * @param {str} videoId 
 */
 function findNextVideo(videoId) {
    let videos = document.getElementsByClassName('video');
    found = false;
    for (let i = 0; i < videos.length; i++) {
        let other_id = videos[i].getAttribute('data-video-id');
        if (other_id == videoId) {
            found = true;
            continue;
        }
        if (!found) {
            continue;
        }
        if (videos[i].style.display == 'none') {
            continue;
        }
        return other_id;
    }
    return null;
}

function findAdjacentVideo(reverse) {
    let vid = document.querySelector('.activevid');
    let next = reverse ? 'previousElementSibling' : 'nextElementSibling';
    if (vid === null) return;
    while (true) {
        vid = vid[next];
        if (vid === null) break;
        if (!vid.classList.contains('video')) continue;
        if (vid.style.display == 'none') continue;
        scrollToVideo(vid);
        return;
    }
}

function scrollToVideo(vid) {
    let header = document.getElementById('header').getBoundingClientRect().bottom;
    let scrollBy = vid.getBoundingClientRect().top - header - 10;
    console.log(
        'scrolling to ',
        vid.attributes['data-video-id'].value,
        scrollBy);

    window.scrollBy(0, scrollBy);
    onScrollEvent(window.scrollY);
}

function browseNextVideo() {
    findAdjacentVideo(false);
}

function browsePrevVideo() {
    findAdjacentVideo(true);
}

function browsePlayVideo() {
    let vid = document.querySelector('.activevid');
    loadPlayer({ target: vid.querySelector('.thumb').parentElement });
}
