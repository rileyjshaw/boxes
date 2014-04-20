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
        <input type="text" ref="msgInput" onChange={this.handleChange} value={this.state.value} />
        <button type="submit">➔</button>
      </form>
    );
  }
});

module.exports = TinyBox;
