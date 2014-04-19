var
React = require('react/addons'),
ReactCSSTransitionGroup = React.addons.CSSTransitionGroup,
Page = require('./page.jsx');

var UI = React.createClass({
  getInitialState: function() {
    return {
      page: '1',
      boxCount: 1,
      messages: [['']]
    };
  },
  handlePageChange: function(page) {
    this.setState({ page: page });
  },
  componentDidMount: function() {
    if(window.location.hostname === this.props.cdnUrl) {
      // extend io.connect to add a news listener to all new connections
      io.connect = (function(originalFunction) {
        return function(url) {
          var socket = originalFunction(url);
          socket.on('news', function(message) {
            console.log(message);
          });
          return socket;
        };
      })(io.connect);

      this.socket = io.connect('http://' + this.props.socketUrl + ':' + this.props.socketPort);

      this.socket.on('updateMessage', (function (index, message) {
        var newMessages = this.state.messages;
        newMessages[index] = message;
        this.setState({messages: newMessages});
      }).bind(this));
      this.socket.on('updateMessages', (function (messages) {
        this.setState({messages: messages});
      }).bind(this));
    } else {
      throw new Error('window.location.hostname is ' + window.location.hostname +
        ' but we were expecting for it to be ' + this.props.cdnUrl +
        '. Change the value of cdnUrl in /app/js/main.jsx to the correct hostname.');
    }
  },
  render: function() {
    var tinyBoxes = this.state.messages.map(function(message) {
      return (
        <tinyBox message={message}>
      );
    });

    return (
      <ReactCSSTransitionGroup transitionName="window" component={React.DOM.div}>
        {tinyBoxes}
      </ReactCSSTransitionGroup>
    );
  }

});

module.exports = UI;
