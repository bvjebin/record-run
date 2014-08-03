"use strict";
(function() {
    window.actions = [];
    var storageAvailable = false;
    if(window.localStorage) {
        storageAvailable = true;
    }
	document.querySelector(".record").addEventListener("click", function(e) {
        e.stopPropagation();
        Record();
	}, false);
	document.querySelector(".run").addEventListener("click", function(e) {
        e.stopPropagation();
        if(Record.stopRecord) Record.stopRecord();
		Run();
	}, false);

    function Record() {
        window.actions = [];
        var action, isRecording = false;

        var uniqueQuerySelector = function(el) {

            if (!el || !el.tagName) {
                throw new TypeError('Element expected');
            }

            function selectors(el) {
                var parts = [];
                var label = null;
                var title = null;
                var alt   = null;
                var name  = null;
                var value = null;

                do {
                    // IDs are unique enough
                    if (el.id) {
                        label = '#' + el.id;
                    } else {
                        // Otherwise, use tag name
                        label     = el.tagName.toLowerCase();
                        var className = el.getAttribute('class');

                        // Tag names could use classes for specificity
                        if (className && className.length) {
                            label += '.' + className.split(' ').join('.');
                        }
                    }

                    // Titles & Alt attributes are very useful for specificity and tracking
                    if (title = el.getAttribute('title')) {
                        label += '[title="' + title + '"]';
                    } else if (alt = el.getAttribute('alt')) {
                        label += '[alt="' + alt + '"]';
                    } else if (name = el.getAttribute('name')) {
                        label += '[name="' + name + '"]';
                    }

                    if (value = el.getAttribute('value')) {
                        label += '[value="' + value + '"]';
                    }

                    parts.unshift(label);
                } while (!el.id && (el = el.parentNode) && el.tagName);

                // Some selectors should have matched at least
                if (!parts.length) {
                    throw new Error('Failed to identify CSS selector');
                }

                return parts;
            }

            var selector  = selectors(el).join(' > ');
            var matches   = document.querySelectorAll(selector);

            // If selector is not unique enough (wow!), then
            // force the `nth-child` pseido selector
            if (matches.length > 1) {
                for (var i = 0; i < matches.length; i++) {
                    if (el === matches[i]) {
                        // Recalculate index based on position of el amongst siblings
                        i = [].indexOf.call(el.parentNode.children, el);

                        selector += ':nth-child(' + (i + 1) + ')';
                        break;
                    }
                }
            }

            return selector;
        };

        function clickEvent(e) {
            var selector = uniqueQuerySelector(e.target);
            Record.record(selector, e);
        }

        Record.record = function(selector, event) {
            action = {};
            var eventHash = {
                altKey: event.altKey,
                shiftKey: event.shiftKey,
                ctrlKey: event.ctrlKey,
                clientX: event.clientX,
                clientY: event.clientY,
                keyCode: event.keyCode,
                offsetX: event.offsetX,
                offsetY: event.offsetY,
                pageX: event.pageX,
                pageY: event.pageY,
                screenX: event.screenX,
                screenY: event.screenY,
                type: event.type,
                which: event.which,
                elementY: (event.pageY - event.target.offsetTop),
                elementX: (event.pageX - event.target.offsetLeft)
            };
            action[selector] = eventHash;
            actions.push(action);
        };

        Record.startRecord = function() {
            isRecording = true;
            document.querySelector("body").classList.add("recordMode");
            document.addEventListener("click", clickEvent);
        };

        Record.stopRecord = function() {
            isRecording = false;
            document.querySelector("body").classList.remove("recordMode");
            document.removeEventListener("click", clickEvent);
        };

        if(isRecording !== true) {
            Record.startRecord();
        }
    }

    function Run() {
        var runActions = JSON.parse(JSON.stringify(actions));

        if(!actions.length) {
            //TODO: Noty show no actions to run
            return;
        }

        var scrollParent = function (node) {
            var parents = function (node, ps) {
                if (node.parentNode === null) { return ps; }

                return parents(node.parentNode, ps.concat([node]));
            };

            var style = function (node, prop) {
                return getComputedStyle(node, null).getPropertyValue(prop);
            };

            var overflow = function (node) {
                return style(node, "overflow") + style(node, "overflow-y") + style(node, "overflow-x");
            };

            var scroll = function (node) {
                return (/(auto|scroll)/).test(overflow(node));
            };


            if (!(node instanceof HTMLElement)) {
                return ;
            }

            var ps = parents(node.parentNode, []);

            for (var i = 0; i < ps.length; i += 1) {
                if (scroll(ps[i])) {
                    return ps[i];
                }
            }
        };

        var runManager = {

            counter: 0,

            countExceeded: false,

            highlighter: "ripple01_record-run_10effect",

            highlighterNode: "",

            init: function() {
                document.querySelector("body").classList.add("runMode");
                this.insertHighlighter();
                this.nextRun();
            },

            insertHighlighter: function() {
                var highlighter = document.getElementById(this.highlighter);
                if(!highlighter) {
                    var rule = "", style = document.createElement("style");
                    style.appendChild(document.createTextNode(""));
                    document.head.appendChild(style);
                    //din't work for some reason so commented
                    rule += "@keyframes ripple-record-run { 100%{ opacity:0; transform: scale(2.5); } }\n";
                    rule += ".ripple-record-run-animate-effect { animation: ripple-record-run 0.65s linear; -webkit-animation: ripple-record-run 0.65s linear; } \n";
                    rule += "@-webkit-keyframes ripple-record-run { 100%{opacity:0;-webkit-transform: scale(2.5);}} ";
                    style.type = 'text/css';

                    if (style.styleSheet) {
                        style.styleSheet.cssText = rule;
                    } else {
                        style.appendChild(document.createTextNode(rule));
                    }

                    var highlighter = document.createElement("div");
                    highlighter.id = this.highlighter;
                    highlighter.style.display = "none";
                    highlighter.style.position = "fixed";
                    highlighter.style.background =  "rgba(255,255,255,.075)";
                    highlighter.style.borderRadius = "50%";
                    highlighter.style.transform = "scale(0)";
                    highlighter.style['-webkit-transform'] = "scale(0)";
                    document.querySelector("body").appendChild(highlighter);
                }
                this.highlighterNode =  highlighter;
            },

            nextRun: function() {
                var item = this.queue.getItem(), selector = Object.keys(item)[0];
                this.run(selector, item[selector]);
            },

            success: function() {
                this.counter = 0;
                this.queue.pop();
                if(this.queue.isEmpty() === false) {
                    this.nextRun();
                } else {
                    this.showSuccessNotification();
                }
            },

            //TODO: convert it to generic noty
            showSuccessNotification: function() {
                var notiBox = document.getElementById("record-run-noty-box");
                if(!notiBox) {
                    var box = document.createElement("div");
                    box.id = "record-run-noty-box";
                    box.style.display = "none";
                    box.style.position = "fixed";
                    box.style.width = "200px";
                    box.style.background = "rgb(14, 186, 94)";
                    box.style.top = "20px";
                    box.style.right = "20px";
                    box.style.border = "1px solid rgb(19, 169, 53)";
                    box.style.height = "50px";
                    box.style.padding = "12px";
                    box.style.textAlign = "center";
                    box.style.color = "rgb(251, 254, 251)";
                    box.innerHTML = "Ran Successfully!";
                    document.body.appendChild(box);
                    box.style.display = "block";
                    box.style.cursor = "pointer";
                    box.addEventListener("click", function(e) {
                        box.style.display = "none";
                    });
                    notiBox = box;
                } else {
                    notiBox.style.display = "block";
                }
                setTimeout(function() {
                    notiBox.style.display = "none";
                }, 5000);
            },

            count: function() {
                this.counter++;
                if(this.counter == 5) {
                    this.countExceeded  = true;
                }
            },

            run: function(selector, event) {
                var _this = this;
                var selector = document.querySelector(selector);
                if(selector != null) {
                    selector.scrollIntoView();
                    var mEvent = document.createEvent("MouseEvent");
                    mEvent.initMouseEvent(event.type, true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                    selector.dispatchEvent(mEvent);
                    this.highlightPoint(selector, event);
                    setTimeout(function() {
                        _this.success();
                    }, 1000);

                } else {
                    if(this.countExceeded === false) {
                        setTimeout(function() {
                            _this.run(selector, event);
                        }, 1000);
                        this.count();
                    } else {
                        //TODO: change to noty
                        alert("Unable to find element.");
                    }
                }
            },

            highlightPoint: function(node, event) {
                var _this = this
                if(this.highlighterNode) {
                    this.highlighterNode.style.height = this.highlighterNode.style.width = "100px";
                    this.highlighterNode.style.top = -(window.pageYOffset - node.offsetTop) + event.elementY - 50 + 'px';
                    this.highlighterNode.style.left = -(window.pageXOffset - node.offsetLeft) + event.elementX - 50 + 'px';
                    this.highlighterNode.style.display = "block";
                    this.highlighterNode.classList.add("ripple-record-run-animate-effect");
                    setTimeout(function() {
                        _this.highlighterNode.style.display = "none";
                        _this.highlighterNode.classList.remove("ripple-record-run-animate-effect");
                    }, 500);
                }
            },

            queue: {

                queue: runActions,

                pop: function() {
                    this.queue.splice(0, 1);
                },

                getItem: function() {
                    return this.queue[0] || null;
                },

                isEmpty: function() {
                    return this.queue.length ? false : true;
                }
            }
        };

        runManager.init();
    }

})();
