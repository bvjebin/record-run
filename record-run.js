"use strict";
(function() {
    var storageAvailable = false;
    if(window.localStorage) {
        storageAvailable = true;
    }
    InsertRecordRun();
    bindButtonEvents();

    function InsertRecordRun() {
        var styleElement, rule, dom = document.createElement("div");
        dom.id = "record-run-button-panel";
        document.querySelector("body").appendChild(dom);
        dom.setAttribute("draggable", true);
        dom.addEventListener("drag", function(e) {
            e.target.style.left = e.pageX;
            e.target.style.top = e.pageY;
        });

        styleElement = document.createElement("style");
        document.head.appendChild(styleElement);
        rule = "#record-run-button-panel { box-shadow: 0px 0px 20px 5px #111; position: fixed; top: 15px; right: 0px; z-index: 999999; padding: 10px; margin: 5px; background: #fff;}";
        rule += ".record-run-button { color: #fff; border: 0; }";
        rule += ".record-run-button.record { background: #2980b9; }\n";
        rule += ".record-run-button.run { background: #27ae60; }\n";
        rule += ".record-run-button.stop { background: #e74c3c; }\n";

        styleElement.type = 'text/css';

        if (styleElement.styleSheet) {
            styleElement.styleSheet.cssText = rule;
        } else {
            styleElement.appendChild(document.createTextNode(rule));
        }
        dom.innerHTML = '<button type="button" class="record record-run-button">Record</button><button type="button" class="record-run-button run">Run</button>';
    }

    function bindButtonEvents() {
        var buttons = document.querySelectorAll(".record-run-button");
        for(var k = 0; k < buttons.length; k++) {
            buttons[k].addEventListener("click", function(e) {
                var text = e.target.innerHTML.toLowerCase();
                e.stopPropagation();
                if(text == "record") {
                    Record();
                } else if(text == "stop") {
                    if(Record.stopRecord) Record.stopRecord();
                } else if(text == "run") {
                    Run();
                }
            }, false);
        }
    }

    function Record() {
        var actions = [], action, isRecording = false;

        var uniqueQuerySelector = function(el) {

            if (!el || !el.tagName) {
                throw new TypeError('Element expected');
            }

            var discardList = ["open"];

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
                        label = el.tagName.toLowerCase();
                        var className = (el.getAttribute("class") || []);

                        // Tag names could use classes for specificity
                        var classes = [];
                        if (className && className.length) {
                            className = className.split(" ");
                            if(className.length > 1) {
                                className.forEach(function(item) {
                                    if(item && item.indexOf(discardList) < 0) classes.push(item);
                                });
                            } else {
                                classes = className;
                            }
                            label += '.' + classes.join('.');
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
            // force the `nth-child` pseudo selector
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
            var recordButton = document.querySelector(".record.record-run-button");
            isRecording = true;
            recordButton.classList.remove("record");
            recordButton.classList.add("stop");
            recordButton.innerHTML = "Stop";
            document.addEventListener("click", clickEvent);
        };

        Record.stopRecord = function() {
            var recordButton = document.querySelector(".stop.record-run-button");
            isRecording = false;
            recordButton.classList.remove("stop");
            recordButton.classList.add("record");
            recordButton.innerHTML = "Record";
            document.removeEventListener("click", clickEvent);
            if(storageAvailable) {
                localStorage.setItem('record-run', JSON.stringify(actions));
            }
        };

        if(isRecording !== true) {
            Record.startRecord();
        }
    }

    function Run() {
        var runActions = JSON.parse(localStorage.getItem('record-run'));

        if(!runActions.length) {
            this.showNotification("No action recorded!", "failed");
            return;
        }

        var runManager = {

            counter: 0,

            countExceeded: false,

            highlighter: "ripple01_record-run_10effect",

            highlighterNode: "",

            init: function () {
                document.querySelector("body").classList.add("runMode");
                this.insertHighlighter();
                this.nextRun();
            },

            insertHighlighter: function () {
                var highlighter = document.getElementById(this.highlighter);
                if (!highlighter) {
                    var rule = "", style = document.createElement("style");
                    style.appendChild(document.createTextNode(""));
                    document.head.appendChild(style);
                    rule += "@keyframes ripple-record-run { 100%{ opacity:0; transform: scale(2.5); } }\n";
                    rule += ".ripple-record-run-animate-effect { animation: ripple-record-run 0.65s linear; -webkit-animation: ripple-record-run 0.65s linear; } \n";
                    rule += "@-webkit-keyframes ripple-record-run { 100%{opacity:0;-webkit-transform: scale(2.5);}} ";
                    style.type = 'text/css';

                    if (style.styleSheet) {
                        style.styleSheet.cssText = rule;
                    } else {
                        style.appendChild(document.createTextNode(rule));
                    }

                    highlighter = document.createElement("div");
                    highlighter.id = this.highlighter;
                    highlighter.style.display = "none";
                    highlighter.style.position = "fixed";
                    highlighter.style.background = "rgba(0,0,0,.075)";
                    highlighter.style.borderRadius = "50%";
                    highlighter.style.transform = "scale(0)";
                    highlighter.style['-webkit-transform'] = "scale(0)";
                    document.querySelector("body").appendChild(highlighter);
                }
                this.highlighterNode = highlighter;
            },

            nextRun: function () {
                var item = this.queue.getItem(), selector = Object.keys(item)[0];
                this.run(selector, item[selector]);
            },

            success: function () {
                this.counter = 0;
                this.queue.pop();
                if (this.queue.isEmpty() === false) {
                    this.nextRun();
                } else {
                    this.showNotification("Ran Successfully!", "success");
                }
            },

            showNotification: function (msg, status) {
                var notiBox = document.getElementById("record-run-noty-box"), background;
                if (!notiBox) {
                    if(status == "success") {
                        background = "#2ecc71";
                    } else if(status == "failed") {
                        background = "#e74c3c";
                    } else if(status == "info") {
                        background = "#2980b9";
                    } else if(status == "warn") {
                        background = "#f39c12";
                    }
                    var boxOption = {
                        tagName: "div",
                        id: "record-run-noty-box",
                        html: msg,
                        style: {
                            display: "none",
                            position: "fixed",
                            width: "200px",
                            background: background,
                            top: "150px",
                            right: "20px",
                            border: "1px solid rgb(19, 169, 53)",
                            minHeight: "20px",
                            padding: "12px",
                            textAlign: "center",
                            color: "rgb(251, 254, 251)"
                        }
                    };
                    var box = this.createElement(boxOption);
                    document.body.appendChild(box);
                    box.style.display = "block";
                    box.style.cursor = "pointer";
                    box.addEventListener("click", function () {
                        box.style.display = "none";
                    });
                    notiBox = box;
                } else {
                    notiBox.style.display = "block";
                }
                setTimeout(function () {
                    notiBox.style.display = "none";
                }, 5000);
            },

            count: function () {
                this.counter++;
                if (this.counter == 5) {
                    this.countExceeded = true;
                }
            },

            run: function (selector, event) {
                var _this = this;
                var selector = document.querySelector(selector);
                if (selector != null) {
                    selector.scrollIntoView();
                    var mEvent = document.createEvent("MouseEvent");
                    mEvent.initMouseEvent(event.type, true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                    selector.dispatchEvent(mEvent);
                    this.highlightPoint(selector, event);
                    setTimeout(function () {
                        _this.success();
                    }, 1000);
                } else {
                    if (this.countExceeded === false) {
                        setTimeout(function () {
                            this.showNotification(this.counter + " - Try to find element!", "info");
                            _this.run(selector, event);
                        }, 1000);
                        this.count();
                    } else {
                        this.showNotification("Unable to find the element!", "failed");
                    }
                }
            },

            highlightPoint: function (node, event) {
                var _this = this, position;
                if (this.highlighterNode) {
                    this.highlighterNode.style.height = this.highlighterNode.style.width = "100px";
                    position = window.getComputedStyle(node, null).getPropertyValue("position");
                    if(position == "fixed") {
                        this.highlighterNode.style.top = event.clientY - 50 + 'px';
                        this.highlighterNode.style.left = event.clientX - 50 + 'px';
                    } else {
                        this.highlighterNode.style.top = -(window.pageYOffset - node.offsetTop) + event.elementY - 50 + 'px';
                        this.highlighterNode.style.left = -(window.pageXOffset - node.offsetLeft) + event.elementX - 50 + 'px';
                    }
                    this.highlighterNode.style.display = "block";
                    this.highlighterNode.classList.add("ripple-record-run-animate-effect");
                    setTimeout(function () {
                        _this.highlighterNode.style.display = "none";
                        _this.highlighterNode.classList.remove("ripple-record-run-animate-effect");
                    }, 500);
                }
            },

            queue: {

                queue: runActions,

                pop: function () {
                    this.queue.splice(0, 1);
                },

                getItem: function () {
                    return this.queue[0] || null;
                },

                isEmpty: function () {
                    return this.queue.length ? false : true;
                }
            },

            createElement: function (options) {
                var tagName = options.tagName || "div",
                    id = options.id || "",
                    styles = options.style || {},
                    html = options.html || "";
                var box = document.createElement(tagName);
                box.id = id;
                box.innerHTML = html;
                for (var prop in styles) {
                    box.style[prop] = styles[prop];
                }
                return box;
            }
        };

        runManager.init();
    }

})();