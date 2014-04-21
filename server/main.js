var io = require('socket.io').listen(8002);

var MAX_BOXES = 16; // boxes
var LOCK_TIME = 48; // seconds
var ADD_CYCLE_RATE = 5; // how many seconds between checking if we should add more boxes
var ADD_INCOMING_RATE = 3; // rate per second that messages need to arrive since the last check to call addBox()
var LOCK_MSG = false; // stored in messages[] at a locked index

var newConnections = [];
var ipSpamChecker = {};
var socketSpamChecker = {};
var messages = [['', 0]];

var boxCount = 1;
var lockCount = 0;
var cycleCount = 0;
var messageCount = 0;

var clock = setInterval(function() {
  // increment lock counter, then lock it if inactive for 180s
  // checking index to ensure we never lock the first box
  function lockBox(message, index) {
    if (++message[1] === LOCK_TIME && index) {
      message[index] = false;
      lockCount++;
    }
  }

  // open up a locked box or double the number of boxes
  function addBox() {
    var lockedIndices = [];
    // if there's no room left, make more boxes
    if (!lockCount) {
      expandBoxes();
    // if there are locked boxes, unlock a random one and use it
    } else {
      messages.forEach(function(message, index) {
        if(!message) {
          lockedIndices.push(index);
        }
      });
      messages[lockedIndices[Math.floor(Math.random() * lockCount)]] = ['Brand new!', 0];
    }
    lockCount--;
    io.sockets.emit('updateMessages', messages);
  };

  // reduces the box count when at least half of the boxes are locked
  function squishBoxes() {
    var newMessages;
    while (lockCount >= boxCount / 2) {
      // strip the falses out
      newMessages = messages.filter(Boolean);

      // reset globals
      boxCount /= 2;
      lockCount = boxCount - newMessages.length;
      messages = sparsify(newMessages, validCount, boxCount);

      io.sockets.emit('updateMessages', messages);
    }
  }

  // called when we need to add a box but there are no locked containers to fill
  function expandBoxes() {
    if(boxCount === MAX_BOXES) {
      return;
    } else {
      lockCount = boxCount;
      boxCount *= 2;
      messages.push(['Brand new!', 0]);
      // always keep the main box in the top left and distribute the new locked boxes
      messages = sparsify(newMessages, boxCount);
    }
  }

  function sparsify(messages, total) {
    var validCount = messages.length;
    // TODO: linearly adding to front right now but random would be nicer
    for(var i = validCount; i < total; i++) {
      messages.push(false);
    }
    return messages;
  }

  var i = newConnections.length;
  // Start a synchronized timer for all the new connections
  while(i--) {
    newConnections.pop().emit('updateMessages', messages);
  }

  // increment lock counters and lock inactive boxes
  messages.forEach(function(message, index) {
    lockBox(message, index);
  });

  squishBoxes();

  cycleCount++;
  if(!(cycleCount %= ADD_CYCLE_RATE) && messageCount / boxCount / ADD_CYCLE_RATE > ADD_INCOMING_RATE) {
    messageCount = 0;
    addBox();
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

  if (!messages[index]) {
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
    messageCount++;
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
