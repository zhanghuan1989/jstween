/*!
 * VERSION: 0.1.0
 * DATE: 2015-11-10
 * GIT:https://github.com/shrekshrek/jstimeline
 *
 * @author: Shrek.wang, shrekshrek@gmail.com
 **/

(function (factory) {
    var root = (typeof self == 'object' && self.self == self && self) ||
        (typeof global == 'object' && global.global == global && global);

    if (typeof define === 'function' && define.amd) {
        define(['jstween', 'exports'], function (JT, exports) {
            root.JTL = factory(root, exports, JT);
        });
    } else if (typeof exports !== 'undefined') {
        var JT = require('jstween');
        factory(root, exports, JT);
    } else {
        root.JTL = factory(root, {}, root.JT);
    }

}(function (root, JTL, JT) {
    var previousJsTimeline = root.JTL;

    JTL.VERSION = '0.1.0';

    JTL.noConflict = function () {
        root.JTL = previousJsTimeline;
        return this;
    };

    // --------------------------------------------------------------------辅助方法
    function extend(obj, obj2) {
        for (var prop in obj2) {
            obj[prop] = obj2[prop];
        }
    }

    var requestFrame = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame;

    // --------------------------------------------------------------------全局update
    var timelines = [];
    var isUpdating = false;

    function globalUpdate() {
        isUpdating = true;
        var _len = timelines.length;
        if (_len === 0) {
            isUpdating = false;
            return;
        }

        var _time = JT.now();
        for (var i = _len - 1; i >= 0; i--) {
            timelines[i]._update(_time);
        }

        requestFrame(globalUpdate);
    }


    // --------------------------------------------------------------------timeline
    function timeline() {
        this.initialize.apply(this, arguments);
    }

    extend(timeline.prototype, {
        initialize: function () {
            this.labels = [];
            this.labelTime = 0;

            this.anchors = [];
            this.anchorId = 0;

            this.tweens = [];

            this.isPlaying = false;

            this.curTime = 0;
            this.lastTime = JT.now();

        },

        _update: function (time) {
            var _time = time - this.lastTime;
            this.lastTime = time;

            if (!this.isPlaying)
                return true;

            this.curTime += _time;

            this._checkHandler();
        },

        _addSelf: function () {
            timelines.unshift(this);
            if (!isUpdating)
                globalUpdate();
            else
                this._update(this.lastTime);
        },

        _removeSelf: function () {
            var i = timelines.indexOf(this);
            if (i !== -1) {
                timelines.splice(i, 1);
            }
        },

        _checkHandler: function () {
            var _len = this.anchors.length;
            if (this.anchorId >= _len) return;

            var _handler = this.anchors[this.anchorId];
            if (this.curTime >= _handler.time) {
                if (this.anchorId == _len - 1) {
                    this._removeSelf();
                    this.isPlaying = false;
                    //this.anchorId++;
                    _handler.handler.apply();
                } else {
                    _handler.handler.apply();
                    this.anchorId++;
                    this._checkHandler();
                }
            }

        },

        _parseTweenTime: function (time, vars, position) {
            var _duration = Math.max(time, 0) * 1000;
            var _delay = Math.max(vars.delay || 0, 0) * 1000;
            var _repeat = Math.max(0, Math.floor(vars.repeat || 0));
            var _repeatDelay = Math.max(vars.repeatDelay || 0, 0) * 1000;
            var _totalDuration = _delay + (_repeatDelay + _duration) * (_repeat + 1);

            var _startTime = this._parsePosition(position);

            this.labelTime = Math.max(this.labelTime, _startTime + _totalDuration);

            return _startTime;
        },

        _parsePosition: function (position) {
            if (position == undefined) return this.labelTime;

            var _time = 0;
            switch (typeof(position)) {
                case 'string':
                    var _s = position.substr(0, 2);
                    var _n = parseInt(parseFloat(position.substr(2)) * 1000);
                    switch (_s) {
                        case '+=':
                            _time = this.labelTime + _n;
                            break;
                        case '-=':
                            _time = this.labelTime - _n;
                            break;
                        default:
                            _time = this.getLabelTime(position);
                            break;
                    }
                    break;
                case 'number':
                    _time = position;
                    break;
            }
            return _time;
        },

        _addAnchor: function (handler, position) {
            var _len = this.anchors.length;
            if (_len == 0) {
                this.anchors.push({time: position, handler: handler});
                return;
            } else if (_len > 0) {
                for (var i = _len - 1; i >= 0; i--) {
                    var _handler = this.anchors[i];
                    if (position >= _handler.time) {
                        this.anchors.splice(i + 1, 0, {time: position, handler: handler});
                        return;
                    }
                }
            }
        },

        _addTween: function(tween){
            this.tweens.unshift(tween);
        },

        _removeTween: function(tween){
            var i = this.tweens.indexOf(tween);
            if (i !== -1) this.tweens.splice(i, 1);
        },

        fromTo: function (target, time, fromVars, toVars, position) {
            var _self = this;
            var _end = toVars.onEnd;
            toVars.onEnd = function(params){
                _self._removeTween(this);
                if(_end) _end.apply(this, params);
            };
            var _handler = function () {
                var _tween = JT.fromTo(target, time, fromVars, toVars);
                _self._addTween(_tween);
            };
            var _time = this._parseTweenTime(time, toVars, position);
            this._addAnchor(_handler, _time);
            return this;
        },

        from: function (target, time, fromVars, position) {
            var _self = this;
            var _end = fromVars.onEnd;
            fromVars.onEnd = function(params){
                _self._removeTween(this);
                if(_end) _end.apply(this, params);
            };
            var _handler = function () {
                var _tween = JT.from(target, time, fromVars);
                _self._addTween(_tween);
            };
            var _time = this._parseTweenTime(time, fromVars, position);
            this._addAnchor(_handler, _time);
            return this;
        },

        to: function (target, time, toVars, position) {
            var _self = this;
            var _end = toVars.onEnd;
            toVars.onEnd = function(params){
                _self._removeTween(this);
                if(_end) _end.apply(this, params);
            };
            var _handler = function () {
                var _tween = JT.to(target, time, toVars);
                _self._addTween(_tween);
            };
            var _time = this._parseTweenTime(time, toVars, position);
            this._addAnchor(_handler, _time);
            return this;
        },

        kill: function(target, position){
            var _handler = function () {
                JT.kill(target);
            };
            var _time = this._parseTweenTime(0, {}, position);
            this._addAnchor(_handler, _time);
            return this;
        },

        add: function (obj, position) {
            var _time = this._parsePosition(position);
            switch (typeof(obj)) {
                case 'function':
                    this._addAnchor(obj, _time);
                    break;
                case 'string':
                    this.addLabel(obj, _time);
                    break;
                default:
                    throw 'add action is wrong!!!';
                    break;
            }
            return this;
        },

        addLabel: function (name, position) {
            this.removeLabel(name);
            var _time = this._parsePosition(position);
            this.labels.push({name: name, time: _time});
            return this;
        },

        removeLabel: function (name) {
            var _len = this.labels.length;
            for (var i = _len - 1; i >= 0; i--) {
                var _label = this.labels[i];
                if (name == _label.name) {
                    this.labels.splice(i, 1);
                    return this;
                }
            }
            return this;
        },

        getLabelTime: function (name) {
            var _len = this.labels.length;
            for (var i = _len - 1; i >= 0; i--) {
                var _label = this.labels[i];
                if (name == _label.name) {
                    return _label.time;
                }
            }
        },

        totalTime: function () {
            return this.labelTime;
        },

        play: function (position) {
            if (this.isPlaying) return;

            var _len = this.tweens.length;
            for (var i = _len - 1; i >= 0; i--) {
                this.tweens[i].play();
            }

            this._addSelf();
            this.isPlaying = true;
            this.lastTime = JT.now();

            if (position !== undefined) {
                this.seek(position);
                this._update(this.lastTime);
            }
        },

        pause: function () {
            if (!this.isPlaying) return;

            var _len = this.tweens.length;
            for (var i = _len - 1; i >= 0; i--) {
                this.tweens[i].pause();
            }

            this._removeSelf();
            this.isPlaying = false;
        },

        seek: function (position) {
            var _time = this._parsePosition(position);
            this.curTime = _time;

            var _len = this.anchors.length;
            for (var i = 0; i < _len; i++) {
                var _handler = this.anchors[i];
                if (_handler.time >= this.curTime) {
                    this.anchorId = i;
                    return;
                }
            }
        },

        clear: function () {
            this.labels = [];
            this.anchors = [];
        },

        destroy: function () {
            this.pause();
            this.clear();
        }

    });


    //---------------------------------------------------------------全局方法
    extend(JTL, {
        create: function () {
            return new timeline();
        },
        kill: function (tl) {
            tl.destroy();
        }
    });

    return JTL;
}));
