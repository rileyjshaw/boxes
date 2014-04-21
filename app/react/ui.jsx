var React = require('react');

var TinyBox = require('./tinybox.jsx');

var LOCK_TIME = 48; // seconds
var LOCK_MSG = false; // stored in messages[] at a locked index

var UI = React.createClass({
  baseColors: [
    [52, 152, 219], // blue
    [211, 84, 0], // deep orange
    [38, 194, 129], // green
    [155, 89, 182], // purple
    [231, 76, 60], // red
    [241, 196, 15], // yellow
    [230, 126, 34], // orange
    [26, 188, 156], // turquiose
    [41, 105, 176], // navy
    [243, 156, 18], // deep yellow
    [255, 176, 242], // pink
    [65, 92, 113], // deep navy
    [124, 169, 81], // deep lime
    [235, 126, 127], // salmon
    [99, 211, 233], // baby blue
    [192, 57, 43] // deep red
  ],
  grays: [], // set in componentWillMount
  getInitialState: function() {
    return {
      activeBox: 0,
      boxCount: 1,
      boxSqrt: 1,
      messages: [['', 0]],
      boxWidth: 1,
      boxHeight: 1,
      msgHistory: []
    };
  },
  setFocus: function(index) {
    this.setState({activeBox: index});
  },
  handleSubmit: function(index, message) {
      // keep the last 60 messages
    this.setState({
      msgHistory: [message].concat(this.state.msgHistory).slice(0, 60)
    });
    this.socket.emit('setMessage', index, message);
  },
  tick: function() {
    // increment fade counters and lock any boxes that have been inactive for LOCK_TIME seconds
    var newMessages = this.state.messages.map((function(messagePair, index) {
      var incMessage = messagePair && [messagePair[0], messagePair[1] + 1];
      if (incMessage[1] >= LOCK_TIME && index) {
        incMessage = LOCK_MSG;
      }
      return incMessage;
    }).bind(this));
    this.setState({messages: newMessages})
  },
  componentWillMount: function() {
    this.grays = this.baseColors.map(function(color) {
      return Math.floor((color[0] + color[1] + color[2]) / 3);
    });
  },
  componentDidMount: function() {
    if (window.location.hostname === this.props.cdnUrl) {
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
        var width, height, messageLength = messages.length;
        if(messageLength === 1) {
          width = 1;
          height = 1;
        } else {
          base2Log = Math.log(messageLength) / Math.log(2);
          width = base2Log;
          height = base2Log;
          // if the log is odd, width needs to be double height
          if (base2Log % 2) {
            height = ++width / 2;
          }
        }
        this.setState({boxCount: messages.length, messages: messages, boxWidth: width, boxHeight: height});
        if (!this.timer) {
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
      var width = 100 / this.state.boxWidth + '%';
      var height = 100 / this.state.boxHeight + '%';

      return (
        // if it's the first one, keep it open forever
        index === 0
          ? <TinyBox
            key={index}
            permanent={true}
            baseColor={this.baseColors[index]}
            index={index}
            active={this.state.activeBox === index}
            handleFocus={this.setFocus}
            handleSubmit={this.handleSubmit}
            boxWidth={width}
            boxHeight={height}
            msgHistory={this.state.msgHistory}
          >{messagePair[0]}</TinyBox>
          // otherwise, decide whether it's a lock or a tinybox and include fade params
          : messagePair
            ? <TinyBox
                key={index}
                lockTime={LOCK_TIME}
                baseColor={this.baseColors[index]}
                fade={messagePair[1]}
                index={index}
                active={this.state.activeBox === index}
                handleFocus={this.setFocus}
                handleSubmit={this.handleSubmit}
                gray={this.grays[index]}
                boxWidth={width}
                boxHeight={height}
                msgHistory={this.state.msgHistory}
              >{messagePair[0]}</TinyBox>
            : <div key={index} className="lockedBox" style={{
                backgroundColor: 'rgb(' + this.grays[index] + ', '
                  + this.grays[index] + ', '
                  + this.grays[index] + ')',
                width: width,
                height: height
              }} />
      );
    }).bind(this));

    return (
      <div className={'page boxes' + this.state.boxCount}>
        {tinyBoxes}
      </div>
    );
  }

});

module.exports = UI;
