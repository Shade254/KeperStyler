function updateStylesFromStorage() {
    chrome.tabs.query({
        active: true,
        lastFocusedWindow: true
    }, tabs => {
        let isKepler = tabs[0].url.includes("kepler.gl/demo");


        chrome.storage.sync.get(['mapbox_styles'], function(result) {
            node = document.getElementById('divStyles');
            while (node.firstChild) {
                node.removeChild(node.lastChild);
            }
            
            if(result.mapbox_styles == null) {
                result.mapbox_styles = [];   
            }

            for (index = 0; index < result.mapbox_styles.length; index++) {
                var n = result.mapbox_styles[index].name;

                var selector = document.createElement('div');
                selector.classList.add('selector');

                var selectorLabel = document.createElement('div');
                selectorLabel.innerHTML = n;
                selectorLabel.classList.add('selectorLabel');

                var buttonWrapper = document.createElement('div');
                buttonWrapper.classList.add('buttonWrapper');

                if (isKepler) {
                    var loadButton = document.createElement('button');
                    loadButton.classList.add('loadButton');
                    loadButton.name = n;
                    loadButton.addEventListener('click', (event) => loadStyleFromStorage(event), false);
                    buttonWrapper.appendChild(loadButton);
                }


                var deleteButton = document.createElement('button');
                deleteButton.classList.add('deleteButton');
                deleteButton.name = n;
                deleteButton.addEventListener('click', (event) => deleteStyleFromStorage(event), false);
                buttonWrapper.appendChild(deleteButton);


                selector.appendChild(selectorLabel);
                selector.appendChild(buttonWrapper);
                document.getElementById('divStyles').appendChild(selector);
            }
        });
    });
}

function injectMapboxStyle() {
    chrome.storage.sync.get(['chosen_style'], function(result) {
        console.log("Injecting style " + result.chosen_style.name);
        var button = [].slice.call(document.querySelectorAll('div')).filter(function(el) {
            return el.className.match(/.*add-map-style-button/);
        });

        if (button.length == 0) {
            var stylesTab = document.querySelectorAll('[data-for="map-nav"]');
            if (stylesTab.length == 0) {
                var openPane = [].slice.call(document.querySelectorAll('div')).filter(function(el) {
                    return el.className.match(/.*side-bar__close/);
                });
                openPane[0].click();
                stylesTab = document.querySelectorAll('[data-for="map-nav"]');
            }
            stylesTab[0].click();
            button = [].slice.call(document.querySelectorAll('div')).filter(function(el) {
                return el.className.match(/.*add-map-style-button/);
            });
        }

        button[0].click();

        var inputs = []
        var dialog = document.querySelector("[class='add-map-style-modal']");

        var all = dialog.getElementsByTagName('*');
        for (var i = -1, l = all.length; ++i < l;) {
            if (all[i].nodeName == "INPUT") {
                inputs.push(all[i]);
            }
        }


        // ------------ set URL -------------------
        let lastValue = inputs[0].value;
        inputs[0].value = result.chosen_style.url;
        let event = new Event("input", {
            target: inputs[0],
            bubbles: true
        });
        // React 15
        event.simulated = true;
        // React 16
        let tracker = inputs[0]._valueTracker;
        if (tracker) {
            tracker.setValue(lastValue);
        }
        inputs[0].dispatchEvent(event);

        // ------------ set token -------------------
        lastValue = inputs[1].value;
        inputs[1].value = result.chosen_style.token;
        event = new Event("input", {
            target: inputs[0],
            bubbles: true
        });
        // React 15
        event.simulated = true;
        // React 16
        tracker = inputs[1]._valueTracker;
        if (tracker) {
            tracker.setValue(lastValue);
        }
        inputs[1].dispatchEvent(event);


        // ------------ set name -------------------
        if (inputs[2].value.length == 0) {
            lastValue = inputs[2].value;
            inputs[2].value = result.chosen_style.name;
            event = new Event("input", {
                target: inputs[2],
                bubbles: true
            });
            // React 15
            event.simulated = true;
            // React 16
            tracker = inputs[2]._valueTracker;
            if (tracker) {
                tracker.setValue(lastValue);
            }
            inputs[2].dispatchEvent(event);
        }


        var confirm = [].slice.call(document.querySelectorAll('div')).filter(function(el) {
            return el.className.match(/.*modal--footer--confirm-button/);
        });

        console.log("Add: %o", confirm[0]);
    });
}


function loadStyleFromStorage(event) {
    chrome.storage.sync.get(['mapbox_styles'], function(result) {
        var styles = result.mapbox_styles.filter(function(el) {
            return el.name == event.target.name;
        });

        if (styles.length == 0) {
            console.log("Style " + event.target.name + " could not be found");
            return;
        }

        chrome.storage.sync.set({
            "chosen_style": styles[0]
        }, function() {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, function(tabs) {
                chrome.scripting.executeScript({
                        target: {
                            tabId: tabs[0].id
                        },
                        function: injectMapboxStyle,
                    },
                    () => {});
            });
        });
    });
}

function deleteStyleFromStorage(event) {
    chrome.storage.sync.get(['mapbox_styles'], function(result) {
        var styles = result.mapbox_styles.filter(function(el) {
            return el.name != event.target.name;
        });

        chrome.storage.sync.set({
            "mapbox_styles": styles
        }, function() {
            console.log('Deleted style ' + event.target.name);
            updateStylesFromStorage();
        });
        return;
    });
}


function saveStyleToStorage(url, token, name) {
    if (name.length == 0 || token.length == 0 || url.length == 0) {
        console.log("One of the fields is empty");
        return;
    }

    style = {
        "name": name,
        "url": url,
        "token": token
    }

    chrome.storage.sync.get(['mapbox_styles'], function(result) {
        if(result.mapbox_styles == null) {
            result.mapbox_styles = [];   
        }

        for (index = 0; index < result.mapbox_styles.length; index++) {
            if (result.mapbox_styles[index].name == name) {
                console.log("Style with name " + name + " already exists");
                return;
            }
        }
        result.mapbox_styles.push(style)
        chrome.storage.sync.set({
            "mapbox_styles": result.mapbox_styles
        }, function() {
            console.log('Saved style %o', style);
            document.getElementById('inputUrl').value = "";
            document.getElementById('inputToken').value = "";
            document.getElementById('inputName').value = "";
            updateStylesFromStorage();
        });
    });
}


document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.sync.get(['mapbox_styles'], function(result) {
        if (result.mapbox_styles == null || result.mapbox_styles.length == 0) {
            fetch('../token.txt')
                .then(response => response.text())
                .then((data) => {
                    saveStyleToStorage("mapbox://styles/shade254/ckrqihpe83q5r17ny7xvzbh7s", data, "Test mapbox layer")
                })
        }
    });

    updateStylesFromStorage();

    var checkPageButton = document.getElementById('saveCredentials');
    checkPageButton.addEventListener('click', function() {
        saveStyleToStorage(document.getElementById('inputUrl').value, document.getElementById('inputToken').value, document.getElementById('inputName').value);
    }, false);

    var fundButton = document.getElementById('fundMe');
    fundButton.addEventListener('click', function() {
        chrome.tabs.create({
            'url': "https://www.linkedin.com/in/miroslav-matocha/"
        });
    });
}, false);