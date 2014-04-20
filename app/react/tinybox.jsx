var React = require('react');

var TinyBox = React.createClass({
  handleFocus: function(index) {
    this.props.handleFocus(index);
  },
  setFocusToSelf: function() {
    this.handleFocus(this.props.index);
  },
  handleSubmit: function(message) {
    this.props.handleSubmit(this.props.index, message);
  },
  render: function() {
    return (
      <div className="tinyBox" onClick={this.setFocusToSelf}>
        <p>{this.props.children}</p>

        {this.props.active
          ? <InputForm handleFocus={this.handleFocus} handleSubmit={this.handleSubmit} currentMsg={this.props.children} />
          : false
        }
      </div>
    );
  }
});

var InputForm = React.createClass({
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
  handleSubmit: function() {
    var msgInputNode = this.refs.msgInput.getDOMNode();
    var msgInput = msgInputNode.value.trim();
    if(msgInput !== this.props.currentMsg) {
      if (!msgInput || typeof msgInput !== 'string' || msgInput.length > 30) {
        console.log('There was an issue with your input');
      } else {
        this.props.handleSubmit(msgInput);
      }
    }
    msgInputNode.value = '';
    return false;
  },
  render: function() {
    return (
      <form className="messageForm" onSubmit={this.handleSubmit} ref="form">
        <input type="text" ref="msgInput" maxlength="30" />
        <button type="submit" value="Go">➔</button>
      </form>
    );
  }
});

module.exports = TinyBox;
