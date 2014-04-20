var React = require('react/addons');
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var TinyBox = React.createClass({
  getInitialState: function() {
    return {gray: (this.props.baseColor[0] + this.props.baseColor[1] + this.props.baseColor[2]) / 3};
  },
  handleFocus: function(index) {
    this.props.handleFocus(index);
  },
  setFocusToSelf: function() {
    this.handleFocus(this.props.index);
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
    var gray = this.state.gray;
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
        : Math.floor(((lockTime - fade) * gray + (fade - lockBreakpoint) * 48) / lockRemainder);
    }).bind(this));

    console.log(shiftVal, baseColor);

    var lightColor = this.colorShift(baseColor, shiftVal);
    var darkColor = this.colorShift(baseColor, -shiftVal);
    var superDarkColor = this.colorShift(baseColor, -shiftVal * 3);

    return (
      <div className="tinyBox" onClick={this.setFocusToSelf} style={
        {
          color: 'rgb(' + lightColor + ')',
          backgroundColor: 'rgb(' + baseColor + ')'
        }
      }>
        <ReactCSSTransitionGroup className="messageTransitionContainer" transitionName="message" component={React.DOM.div}>
          <MessageBanner key={this.props.children} />
        </ReactCSSTransitionGroup>

        {this.props.active
          ? <InputForm handleFocus={this.handleFocus} handleSubmit={this.handleSubmit} currentMsg={this.props.children} style={
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

var MessageBanner = React.createClass({
  render: function() {
    return <p>{this.props.key}</p>
  }
});

var InputForm = React.createClass({
  getInitialState: function() {
    return {value: ''};
  },
  componentDidMount: function() {
    key.setScope('input');
    key.filter = function filter(event){
      return true;
    };
    key('esc', (function() {
      this.props.handleFocus(-1);
    }).bind(this));

    this.refs.msgInput.getDOMNode().focus();
  },
  componentWillUnmount: function() {
    key.setScope('all');
    key.filter = function filter(event){
      var tagName = (event.target || event.srcElement).tagName;
      return !(tagName == 'INPUT' || tagName == 'SELECT' || tagName == 'TEXTAREA');
    };
    key.unbind('esc', this.props.handleBlur);
  },
  handleChange: function(event) {
    this.setState({value: event.target.value.substr(0, 59)});
  },
  handleSubmit: function() {
    var msgInputNode = this.refs.msgInput.getDOMNode();
    var msgInput = msgInputNode.value.trim();
    if(msgInput !== this.props.currentMsg) {
      if (!msgInput || typeof msgInput !== 'string' || msgInput.length > 60) {
        console.log('There was an issue with your input');
      } else {
        this.props.handleSubmit(msgInput);
      }
    }
    this.setState({value: ''});
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
