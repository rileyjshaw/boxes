var React = require('react');

var TinyBox = require('./tinybox.jsx');

var UI = React.createClass({
  getInitialState: function() {
    return {
      activeBox: 0,
      boxCount: 1,
      boxSqrt: 1,
      messages: [['', 0]],
      boxWidth: 1,
      boxHeight: 1,
      baseColors: [
        [52, 152, 219], // blue
        [38, 194, 129], // green
        [155, 89, 182], // purple
        [231, 76, 60], // red
        [241, 196, 15], // yellow
        [230, 126, 34], // orange
        [26, 188, 156], // turquiose
        [41, 105, 176], // navy
        [243, 156, 18], // deep yellow
        [255, 176, 242], // pink
        [211, 84, 0], // deep orange
        [65, 92, 113], // deep navy
        [124, 169, 81], // deep lime
        [235, 126, 127], // salmon
        [99, 211, 233], // baby blue
        [192, 57, 43] // deep red
      ],
      grays: [], // set in componentWillMount
      lockTime: 48,
      locks: [false]
    };
  },
  resetLocks: function() {
    var boxCount = this.state.boxCount;
    var newLocks = [];
    while(boxCount--) {
      newLocks.push(false);
    }
    this.setState({locks: newLocks});
  },
  setFocus: function(index) {
    this.setState({activeBox: index});
  },
  handleSubmit: function(index, message) {
    this.socket.emit('setMessage', index, message);
  },
  lockBox: function(index) {
    var newLocks = this.state.locks;
    newLocks[index] = true;
    this.setState({locks: newLocks});
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
  componentWillMount: function() {
    this.setState({grays: this.state.baseColors.map(function(color) {
      return (color[0] + color[1] + color[2]) / 3;
    })});
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
      this.socket.on('updateMessages', (function (messages, locks) {
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
        this.setState({boxCount: messages.length, locks: locks, messages: messages, boxWidth: width, boxHeight: height});
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
            permanent={true}
            baseColor={this.state.baseColors[index]}
            index={index}
            active={this.state.activeBox === index}
            handleFocus={this.setFocus}
            handleSubmit={this.handleSubmit}
            boxWidth={width}
            boxHeight={height}
          >{messagePair[0]}</TinyBox>
          // otherwise, decide whether it's a lock or a tinybox and include fade params
          : this.state.locks[index]
            ? <div className="lockedBox" style={{
              backgroundColor: 'rgb(' + this.state.grays[index] + ', '
                + this.state.grays[index] + ', '
                + this.state.grays[index] + ')',
              width: width,
              height: height
            }} />
            : <TinyBox
              lockTime={this.state.lockTime}
              baseColor={this.state.baseColors[index]}
              fade={messagePair[1]}
              index={index}
              active={this.state.activeBox === index}
              handleFocus={this.setFocus}
              handleSubmit={this.handleSubmit}
              gray={this.state.grays[index]}
              boxWidth={width}
              boxHeight={height}
            >{messagePair[0]}</TinyBox>
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
