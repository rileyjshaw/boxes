var React = require('react');

var TinyBox = require('./tinybox.jsx');

var UI = React.createClass({
  getInitialState: function() {
    return {
      activeBox: -1,
      boxCount: 1,
      messages: [['', 0]],
      baseColors: [[52, 152, 219], [52, 152, 219], [52, 152, 219], [52, 152, 219], [52, 152, 219], [52, 152, 219], [52, 152, 219], [52, 152, 219], [52, 152, 219], [52, 152, 219], [52, 152, 219], [52, 152, 219]],
      lockTime: 30,
      locks: [false],
      lockIndices: []
    };
  },
  resetLocks: function() {
    var boxCount = this.state.boxCount;
    var newLocks = [];
    while(boxCount--) {
      newLocks.push(false);
    }
    this.setState({locks: newLocks});
    this.setState({lockIndices: []});
  },
  setFocus: function(index) {
    this.setState({activeBox: index});
  },
  handleSubmit: function(index, message) {
    this.socket.emit('setMessage', index, message);
  },
  lockBox: function(index) {
    var newLocks = this.state.locks;
    var newLockIndices = this.state.lockIndices;
    newLocks[index] = true;
    newLockIndices.push(index);
    if (newLockIndices.length === this.state.boxCount / 2) {
      this.downsize();
    } else {
      this.setState({locks: newLocks});
      this.setState({lockIndices: newLockIndices});
    }
  },
  tick: function() {
    var newMessages = this.state.messages;
    // increment fade counters and lock any boxes that have been inactive for lockTime seconds
    newMessages.map((function(pair, index) {
      if (++pair[1] >= this.state.lockTime) {
        this.lockBox(index);
      }
    }).bind(this));
    this.setState({messages: newMessages})
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
        newMessages[index] = [message, 0];
        this.setState({messages: newMessages});
      }).bind(this));
      this.socket.on('updateMessages', (function (messages) {
        this.setState({messages: messages});
        if(!this.timer) {
          this.timer = setInterval(this.tick, 1000);
          this.tick();
        }
      }).bind(this));
    } else {
      throw new Error('window.location.hostname is ' + window.location.hostname +
        ' but we were expecting for it to be ' + this.props.cdnUrl +
        '. Change the value of cdnUrl in /app/js/main.jsx to the correct hostname.');
    }
  },
  render: function() {
    var tinyBoxes = this.state.messages.map((function(messagePair, index) {
      return (
        this.state.locks[index]
          ? <div className="lockedBox" />
          : <TinyBox
            lockTime={this.state.lockTime}
            baseColor={this.state.baseColors[index]}
            fade={messagePair[1]}
            index={index}
            active={this.state.activeBox === index}
            handleFocus={this.setFocus}
            handleSubmit={this.handleSubmit}
          >{messagePair[1]}</TinyBox>
      );
    }).bind(this));

    return (
      <div className="page">
        {tinyBoxes}
      </div>
    );
  }

});

module.exports = UI;
