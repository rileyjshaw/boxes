var io = require('socket.io').listen(8002);
var newConnections = [];
var ipSpamChecker = {};
var socketSpamChecker = {};
var boxCount = 4;
var messages = [['', 0], ['', 0], ['', 0], ['', 0]];
var locks = [];
var lockCount = 0;

var fadeClock = setInterval(function() {
  // Lock a box if it has been inactive for 180s
  var lockHandler = function(message, index) {
    if (++message[1] === 18) {
      locks[index] = true;
      // Downsize if half of the boxes are locked
      if (++lockCount === boxCount / 2) {
        var newMessages = [];
        messages.forEach(function(message, index) {
          if (!locks[index]) {
            newMessages.push(message);
          }
        });
        // reset globals
        messages = newMessages;
        boxCount /= 2;
        locks = [];
        lockCount = 0;

        io.sockets.emit('updateMessages', messages);
        return true;
      }
    }
  };

  var i = newConnections.length;
  // Start a synchronized timer for all the new connections
  while(i--) {
    newConnections.pop().emit('updateMessages', messages);
  }

  var b = true;
  while (b) {
    for(i = 0; i < boxCount; i++) {
      b = lockHandler(messages[i], i);
      if (b) break;
    }
  }

  // Clear the spam checker
  ipSpamChecker = {};
  socketSpamChecker = {};
}, 1000);

function setMessage(index, message, socket) {
  var ipSpamCount = ipSpamChecker[socket.ipAddress];
  var socketSpamCount = socketSpamChecker[socket.id];

  // Check for spamming from a single socket (warning at > 5 / second)
  if (!socketSpamCount) {
    socketSpamChecker[socket.id] = 1;
  } else if (socketSpamCount > 5) {
    if(socket.socketWarningFlag) {
      socket.emit('news', 'There\'s too much traffic from your computer; refresh to reconnect!');
      socket.disconnect();
    } else {
      socket.socketWarningFlag = 1;
      socket.emit('news', 'It looks like you\'re sending a lot of requests... you aren\'t cheating, are you?');
    }
  } else ++socketSpamChecker[socket.id];

  // Check for spamming from a single IP address (warning at > 400 / second)
  if (!ipSpamCount) {
    ipSpamChecker[socket.ipAddress] = 1;
  } else if (++ipSpamCount > 400) {
    if(socket.ipWarningFlag) {
      socket.emit('news', 'There\'s too much traffic from your network. Try not to ruin the game for everyone, refresh to reconnect.');
      socket.disconnect();
    } else {
      socket.ipWarningFlag = 1;
      socket.emit('news', 'It looks like you\'re sending a lot of requests... you aren\'t cheating, are you?');
    }
  } else ++ipSpamChecker[socket.ipAddress];

  if (locks[index]) {
    socket.emit('news', 'That box seems to be locked right now.');
    socket.superStrikes += 0.5;
  } else if (typeof message !== 'string') {
    socket.emit('news', 'Your message should be a string.');
    socket.superStrikes++;
  } else if(message.length > 60) {
    socket.emit('news', 'Your message can\'t be more than 60 characters.');
    socket.superStrikes++;
  } else if(message === messages[index][0]) {
    socket.emit('news', 'That\'s already the message, yo!');
    socket.superStrikes += 0.3;
  } else {
    messages[index] = [message, 0];
    io.sockets.emit('updateMessage', index, message);
  }

  if (socket.superStrikes >= 3) {
    socket.emit('news', 'It looks like we\'re getting a lot of errors from your session, refresh to reconnect.');
    socket.disconnect();
  }
}

io.sockets.on('connection', function(socket) {
  socket.superStrikes = 0;
  socket.ipAddress = socket.handshake.address.address;
  newConnections.push(socket);

  socket.on('setMessage', function(index, message) {
    setMessage(index, message, socket);
  });
});
