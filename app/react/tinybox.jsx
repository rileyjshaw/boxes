var React = require('react/addons');
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var TinyBox = React.createClass({
  getInitialState: function() {
    return {class: ''};
  },
  handleFocus: function(index) {
    this.props.handleFocus(index);
  },
  componentWillMount: function() {
    React.initializeTouchEvents(true);
  },
  setFocusToSelf: function() {
    this.props.active
      ? this.refs.form.refs.msgInput.getDOMNode().focus()
      : this.handleFocus(this.props.index);
  },
  setFocusToSelfMobile: function() {
    this.setState({class: 'mobile-active'});
    this.setFocusToSelf();
  },
  handleSubmit: function(message) {
    this.props.handleSubmit(this.props.index, message);
  },
  colorShift: function(base, amount) {
    return base.map(function(value) {
      return Math.min(255, Math.max(0, value + amount));
    });
  },
  render: function() {
    if (!this.props.permanent) {
      var gray = this.props.gray;
      var fade = this.props.fade;
      var lockTime = this.props.lockTime;
      var lockBreakpoint = lockTime * 2 / 3;
      var lockRemainder = lockTime - lockBreakpoint;

      var shiftVal = fade < lockBreakpoint
        ? 48
        : Math.floor(48 * (1 - (fade - lockBreakpoint) / lockRemainder));

      var baseColor = this.props.baseColor.map((function(value) {
        return fade < lockBreakpoint
          ? Math.floor(((lockBreakpoint - fade) * value + fade * gray) / lockBreakpoint)
          : gray;
      }).bind(this));
    } else {
      var baseColor = this.props.baseColor;
      var shiftVal = 48;
    }

    var lightColor = this.colorShift(baseColor, shiftVal);
    var darkColor = this.colorShift(baseColor, -shiftVal);
    var superDarkColor = this.colorShift(baseColor, -shiftVal * 3);

    return (
      <div className="tinyBox" onClick={this.setFocusToSelf}
        onTouchStart={this.setFocusToSelfMobile} style={
        {
          height: this.props.boxHeight,
          width: this.props.boxWidth,
          color: 'rgb(' + lightColor + ')',
          backgroundColor: 'rgb(' + baseColor + ')'
        }
      }>

        <ReactCSSTransitionGroup transitionName="messageList" transitionLeave={false}>
          <MessageList messages={this.props.children} />
        }
        </ReactCSSTransitionGroup>

        {this.props.active
          ? <InputForm handleFocus={this.handleFocus} handleSubmit={this.handleSubmit} currentMsg={this.props.children} msgHistory={this.props.msgHistory} ref="form" style={
            {
              color: 'rgb(' + superDarkColor + ')',
              backgroundColor: 'rgb(' + darkColor + ')'
            }
          }/>
          : false
        }
      </div>
    );
  }
});

var MessageList = React.createClass({
  render: function() {
    var messages = this.props.messages.map(function(message, index) {

      return <li key={message[1]}>{message[0]}</li>
    });
    return (
      <ReactCSSTransitionGroup className={"messageTransitionContainer"} transitionName="message" transitionLeave={false} component={React.DOM.ul}>
        {messages}
      </ReactCSSTransitionGroup>
    );
  }
});

var InputForm = React.createClass({
  getInitialState: function() {
    return {
      value: '',
      historyIndex: -1
    };
  },
  componentDidMount: function() {
    key.setScope('input');
    key.filter = function filter(event){
      return true;
    };
    key('esc', (function() {
      this.props.handleFocus(-1);
    }).bind(this));
    key('up', this.handleHistory);
    key('down', this.handleHistory);
    this.refs.msgInput.getDOMNode().focus();
  },
  componentWillUnmount: function() {
    key.setScope('all');
    key.filter = function filter(event){
      var tagName = (event.target || event.srcElement).tagName;
      return !(tagName == 'INPUT' || tagName == 'SELECT' || tagName == 'TEXTAREA');
    };
    key.unbind('esc');
    key.unbind('up');
    key.unbind('down');
  },
  handleChange: function(event) {
    this.setState({value: event.target.value.substr(0, 60)});
  },
  handleHistory: function(event, handler) {
    var key = handler.shortcut, newIndex;
    if (handler.shortcut === 'up') {
      newIndex = Math.min(this.state.historyIndex + 1, this.props.msgHistory.length - 1);
    } else if (handler.shortcut === 'down') {
      newIndex = Math.max(this.state.historyIndex - 1, -1);
    }
    this.setState({
      historyIndex: newIndex,
      value: this.props.msgHistory[newIndex] || ''
    });
  },
  handleSubmit: function(e) {
    e.preventDefault();
    var msgInputNode = this.refs.msgInput.getDOMNode();
    var msgInput = msgInputNode.value.trim();
    if (
      !msgInput ||
      typeof msgInput !== 'string' ||
      (this.props.currentMsg.length && msgInput === this.props.currentMsg[this.props.currentMsg.length - 1][0]) ||
      msgInput.length > 60
    ) {
      console.log('There was an issue with your input');
    } else {
      this.props.handleSubmit(msgInput);
    }
    this.setState({
      value: '',
      historyIndex: -1
    });
    return false;
  },
  render: function() {
    return (
      <form className="messageForm" onSubmit={this.handleSubmit} ref="form">
        <input type="text" ref="msgInput" onChange={this.handleChange} value={this.state.value} style={this.props.style} />
        <button type="submit" style={this.props.style}>➔</button>
      </form>
    );
  }
});

module.exports = TinyBox;
