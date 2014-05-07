var io = require('socket.io').listen(8002);

var MAX_BOXES = 16; // boxes
var MAX_MESSAGES = 20;
var LOCK_TIME = 48; // seconds
var ADD_CYCLE_RATE = 5; // how many seconds between checking if we should add more boxes
var ADD_INCOMING_RATE = 2; // rate per second (per box) that messages need to arrive since the last check to call addBox()
var LOCK_MSG = false; // stored in messages[] at a locked index

var newConnections = [];
var ipSpamChecker = {};
var socketSpamChecker = {};
var messages = [[[], 0]];

var boxCount = 1;
var lockCount = 0;
var cycleCount = 0;
var messageCount = 0;

var clock = setInterval(function() {
  // increment lock counter, then lock it if inactive for 180s
  // checking index to ensure we never lock the first box
  function lockBox(message, index) {
    if (++message[1] === LOCK_TIME && index) {
      io.sockets.emit('lockBox', index);
      messages[index] = LOCK_MSG;
      lockCount++;
    }
  }

  // open up a locked box or double the number of boxes
  function addBox() {
    var lockedIndices = [], luckyWinner;
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
      luckyWinner = lockedIndices[Math.floor(Math.random() * lockCount)];
      messages[luckyWinner] = [['Brand new!'], 0];
      lockCount--;
      io.sockets.emit('pushMessage', luckyWinner, 'Brand new!');
    }
  };

  // reduces the box count when at least half of the boxes are locked
  function squishBoxes() {
    var squished = false, newMessages;

    while (lockCount >= boxCount / 2) {
      // strip the falses out
      newMessages = messages.filter(Boolean);

      // reset globals
      boxCount /= 2;
      lockCount = boxCount - newMessages.length;
      messages = sparsify(newMessages, boxCount);
      squished = true;
    }

    if(squished) {
      io.sockets.emit('updateMessages', messages);
    }
  }

  // called when we need to add a box but there are no locked containers to fill
  function expandBoxes() {
    if(boxCount !== MAX_BOXES) {
      lockCount = boxCount - 1;
      boxCount *= 2;
      messages.push([['Brand new!'], 0]);
      // always keep the main box in the top left and distribute the new locked boxes
      messages = sparsify(messages, boxCount);
      io.sockets.emit('updateMessages', messages);
    }
  }

  // fill a message array with locked boxes to ensure its length is 2^n
  function sparsify(messages, total) {
    var falsesToInsert = total - messages.length;

    while (falsesToInsert--) {
      // insert false at a random index between 1 and end
      messages.splice(Math.floor(Math.random() * (total - 1) + 1), 0, false);
    }

    return messages;
  }

  // start the synchronized timer for all new connections
  var i = newConnections.length;
  while (i--) {
    newConnections.pop().emit('updateMessages', messages);
  }

  // increment lock counters and lock inactive boxes, squish if necessary
  messages.forEach(function(message, index) {
    lockBox(message, index);
  });
  squishBoxes();

  // check if it's blowing up and addBox accordingly, then reset messageCount
  cycleCount++;
  if (!(cycleCount %= ADD_CYCLE_RATE)) {
    if (messageCount / boxCount / ADD_CYCLE_RATE >= ADD_INCOMING_RATE) {
      addBox();
    }
    messageCount = 0;
  }

  // clear the spam checker
  ipSpamChecker = {};
  socketSpamChecker = {};
}, 1000);

function setMessage(index, message, socket) {
  var ipSpamCount = ipSpamChecker[socket.ipAddress];
  var socketSpamCount = socketSpamChecker[socket.id];
  var overflowMsgs;

  // check for spamming from a single socket (warning at > 10 / second)
  if (!socketSpamCount) {
    socketSpamChecker[socket.id] = 1;
  } else if (socketSpamCount > 10) {
    if(socket.socketWarningFlag) {
      socket.emit('news', 'There\'s too much traffic from your computer; refresh to reconnect.');
      socket.disconnect();
    } else {
      socket.socketWarningFlag = 1;
      socketSpamChecker[socket.id] = 0;
      socket.emit('news', 'It looks like you\'re sending a lot of requests... try to slow down a bit.');
    }
  } else ++socketSpamChecker[socket.id];

  // Check for spamming from a single IP address (warning at > 400 / second)
  if (!ipSpamCount) {
    ipSpamChecker[socket.ipAddress] = 1;
  } else if (++ipSpamCount > 400) {
    if(socket.ipWarningFlag) {
      socket.emit('news', 'There\'s too much traffic from your network; refresh to reconnect.');
      socket.disconnect();
    } else {
      socket.ipWarningFlag = 1;
      socket.emit('news', 'It looks like your network is sending a lot of requests... try to slow down a bit.');
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
  } else if(message === messages[index][0][ messages[index][0].length - 1 ]) {
    socket.emit('news', 'That\'s already the message, yo!');
    socket.superStrikes += 0.3;
  } else {
    // push the new message, and remove from the front if the array is too long
    overflowMsgs = Math.max(messages[index][0].push(message) - MAX_MESSAGES, 0);
    while(overflowMsgs--)
      messages[index][0].shift();

    messages[index][1] = 0;
    io.sockets.emit('pushMessage', index, message);
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
