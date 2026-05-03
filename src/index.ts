import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { publisher, redis, subscriber } from "./redis-connection.js";

dotenv.config();
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 3000;
const CHECKBOX_STATE_KEY = "checkbox-state";
const USER_COUNT_KEY = "user-count";
const CHECKBOX_COUNT = 1000000;
app.use(express.json());
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});
app.use(express.static("public"));

try {
  httpServer.listen(PORT, () => {
    console.log(`server running on ${PORT}`);
  });
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
}

await subscriber.subscribe("internal-server:checkbox-state-change");
await subscriber.subscribe("internal-server:userCount");

//data in redis
let redisCheckboxState = await redis.get(CHECKBOX_STATE_KEY);
let redisConnectedUser = await redis.get(USER_COUNT_KEY);

//server maintained data
let connectedUser: number;
let checkBoxState: Array<boolean>;
let rateLimitingHashMap = new Map<string, number>();

if (!redisCheckboxState) {
  checkBoxState = new Array(CHECKBOX_COUNT).fill(false);
  await redis.set(CHECKBOX_STATE_KEY, JSON.stringify(checkBoxState));
} else {
  checkBoxState = JSON.parse(redisCheckboxState);
}

if (!redisConnectedUser) {
  connectedUser = 0;
  await redis.set(USER_COUNT_KEY, "0");
} else {
  connectedUser = parseInt(redisConnectedUser, 10);
}

io.on("connection", async (socket) => {
  connectedUser++;
  socket.emit("onConnect", checkBoxState);
  await redis.set(USER_COUNT_KEY, String(connectedUser));
  publisher.publish("internal-server:userCount", String(connectedUser));
  socket.on("checkboxChange", async (data) => {
    const index = Number(data.index);
    const state = Boolean(data.state);
    const lastOperationTime = rateLimitingHashMap.get(socket.id);
    if (lastOperationTime) {
      const timeElapsed = Date.now() - lastOperationTime;
      if (timeElapsed < 2 * 1000) {
        return socket.emit("server:rateLimitExceeded", {
          message: `Rate limit exceeded. Please wait.`,
        });
      }
    }
    rateLimitingHashMap.set(socket.id, Date.now());

    if (isNaN(index) || index < 0 || index >= checkBoxState!.length) {
      return socket.emit("error", { message: "Invalid checkbox index" });
    }
    checkBoxState[index] = state;
    await redis.set(CHECKBOX_STATE_KEY, JSON.stringify(checkBoxState));
    publisher.publish(
      "internal-server:checkbox-state-change",
      JSON.stringify(data),
    );
  });
  socket.on("disconnect", async () => {
    connectedUser--;
    await redis.set(USER_COUNT_KEY, String(connectedUser));
    publisher.publish("internal-server:userCount", String(connectedUser));
  });
});

subscriber.on("message", (channel, message) => {
  if (channel === "internal-server:checkbox-state-change") {
    io.emit("checkboxChange", message);
  }
  if (channel === "internal-server:userCount") {
    console.log(message);
    io.emit("userCount", message);
  }
});
