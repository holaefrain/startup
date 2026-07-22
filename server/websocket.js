const { WebSocketServer } = require("ws");
const { getUserByToken } = require("./authHelpers");

// Keyed by userId string (ObjectId.toString()) - a user can have more than one tab/connection open at once.
const connectionsByUserId = new Map();

// The only cookie this app ever sets is `token`, so a full Cookie-header parser isn't needed - just pull out that one name=value pair.
function parseTokenFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("token="));
  return match ? decodeURIComponent(match.slice("token=".length)) : null;
}

// Adds a connection to a user's set, creating the set on first connect.
function registerConnection(userId, ws) {
  if (!connectionsByUserId.has(userId)) {
    connectionsByUserId.set(userId, new Set());
  }
  connectionsByUserId.get(userId).add(ws);
}

// Removes a closed connection, dropping the whole entry once a user has none left.
function unregisterConnection(userId, ws) {
  const sockets = connectionsByUserId.get(userId);
  if (!sockets) return;
  sockets.delete(ws);
  if (sockets.size === 0) connectionsByUserId.delete(userId);
}

// Sends `payload` to every open connection for each given user id - used to push a new message to both match participants (and any of their other open tabs) at once.
function broadcastToUsers(userIds, payload) {
  const data = JSON.stringify(payload);
  for (const userId of userIds) {
    const sockets = connectionsByUserId.get(userId.toString());
    if (!sockets) continue;
    for (const ws of sockets) {
      if (ws.readyState === ws.OPEN) ws.send(data);
    }
  }
}

// Wires a WebSocketServer onto an existing http.Server for path /ws - entirely separate from Express's middleware stack, so auth here is a manual cookie parse + session lookup rather than req.cookies/getAuthenticatedUser.
function attachWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });
  wss.on("error", (err) => console.error("WebSocketServer error", err));

  httpServer.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url, "http://localhost");
    if (pathname !== "/ws") {
      socket.destroy();
      return;
    }

    const token = parseTokenFromCookieHeader(request.headers.cookie);
    getUserByToken(token)
      .then((user) => {
        if (!user) {
          socket.destroy();
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => {
          const userId = user._id.toString();
          registerConnection(userId, ws);
          ws.on("error", (err) => console.error("WebSocket connection error", err));
          ws.on("close", () => unregisterConnection(userId, ws));
        });
      })
      .catch((err) => {
        console.error("WebSocket auth lookup failed", err);
        socket.destroy();
      });
  });

  return wss;
}

module.exports = { attachWebSocketServer, broadcastToUsers };
