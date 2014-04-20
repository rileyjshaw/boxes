var io = require('socket.io').listen(8002);
var messages = ['Welcome', 'to', 'tinybox.es', 'we', 'hope', 'you', 'enjoy', 'your', 'stay'];
var ipSpamChecker = {};
var socketSpamChecker = {};

var fadeClock = setInterval(function() {
  //TODO: Handle fades

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

  if (typeof message !== 'string') {
    socket.emit('news', 'Your message should be a string.');
    socket.superStrikes++;
  } else if(message.length > 60) {
    socket.emit('news', 'Your message can\'t be more than 60 characters.');
    socket.superStrikes++;
  } else if(message === messages[index]) {
    socket.emit('news', 'That\'s already the message, yo!');
    socket.superStrikes += 0.3;
  } else {
    messages[index] = message;
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
  socket.emit('updateMessages', messages);

  socket.on('setMessage', function(index, message) {
    setMessage(index, message, socket);
  });
});
