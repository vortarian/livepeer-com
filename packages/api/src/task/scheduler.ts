import { ConsumeMessage } from "amqplib";
import { db } from "../store";
import messages from "../store/messages";
import Queue from "../store/queue";
import { Asset, Task } from "../schema/types";
import { v4 as uuid } from "uuid";
import { WithID } from "../store/types";
export default class TaskScheduler {
  queue: Queue;
  running: boolean;
  constructor({ queue }) {
    this.running = true;
    this.queue = queue;
  }
  async start() {
    await this.queue.consume("task", this.handleTaskQueue.bind(this));
  }

  stop() {
    // this.db.queue.unsetMsgHandler();
    this.running = false;
  }

  async handleTaskQueue(data: ConsumeMessage) {
    let event: messages.TaskResult;
    try {
      event = JSON.parse(data.content.toString());
      console.log(
        "events: got task result message",
        JSON.stringify(event, null, 2)
      );
    } catch (err) {
      console.log("events: error parsing task message", err);
      this.queue.ack(data);
      return;
    }

    let ack: boolean;
    try {
      ack = await this.processTaskEvent(event);
    } catch (err) {
      ack = true;
      console.log("handleTaskQueue Error ", err);
    } finally {
      if (ack) {
        this.queue.ack(data);
      } else {
        setTimeout(() => this.queue.nack(data), 1000);
      }
    }
  }

  async processTaskEvent(event: messages.TaskResult): Promise<boolean> {
    const tasks = await db.task.find({ id: event.task.id });
    if (!tasks?.length || !tasks[0].length) {
      console.log(`task event process error: task ${event.task.id} not found`);
      return true;
    }
    const task = tasks[0][0];

    // TODO: bundle all db updates in a single transaction
    if (event.error) {
      await this.failTask(task, event.error.message);
      // TODO: retry task
      console.log(
        `task event process error: err="${event.error.message}" unretriable=${event.error.unretriable}`
      );
      return true;
    }

    switch (event.task.type) {
      case "import":
        let assetSpec = event.output?.import?.assetSpec;
        if (!assetSpec) {
          const error = "bad task output: missing assetSpec";
          console.error(
            `task event process error: err=${error} taskId=${event.task.id}`
          );
          await this.failTask(task, error, event.output);
          return true;
        }
        await db.asset.update(task.outputAssetId, {
          size: assetSpec.size,
          hash: assetSpec.hash,
          videoSpec: assetSpec.videoSpec,
          status: "ready",
          updatedAt: Date.now(),
        });
        break;
      case "transcode":
        assetSpec = event.output?.transcode?.asset?.assetSpec;
        if (!assetSpec) {
          const error = "bad task output: missing assetSpec";
          console.error(
            `task event process error: err=${error} taskId=${event.task.id}`
          );
          await this.failTask(task, error, event.output);
          return true;
        }
        await db.asset.update(task.outputAssetId, {
          size: assetSpec.size,
          hash: assetSpec.hash,
          videoSpec: assetSpec.videoSpec,
          status: "ready",
          updatedAt: Date.now(),
        });
        break;
    }
    await db.task.update(task.id, {
      status: {
        phase: "completed",
        updatedAt: Date.now(),
      },
      output: event.output,
    });
    return true;
  }

  private async failTask(task: Task, error: string, output?: Task["output"]) {
    await db.task.update(task.id, {
      output,
      status: {
        phase: "failed",
        updatedAt: Date.now(),
        errorMessage: error,
      },
    });
    if (task.outputAssetId) {
      await db.asset.update(task.outputAssetId, {
        status: "failed",
        updatedAt: Date.now(),
      });
    }
  }

  async scheduleTask(
    type: Task["type"],
    params: Task["params"],
    inputAsset?: Asset,
    outputAsset?: Asset
  ) {
    const task = await this.createTask(type, params, inputAsset, outputAsset);
    await this.enqueueTask(task);
    return task;
  }

  createTask(
    type: Task["type"],
    params: Task["params"],
    inputAsset?: Asset,
    outputAsset?: Asset
  ) {
    return db.task.create({
      id: uuid(),
      createdAt: Date.now(),
      type: type,
      outputAssetId: outputAsset?.id,
      inputAssetId: inputAsset?.id,
      userId: inputAsset?.userId || outputAsset?.userId,
      params,
      status: {
        phase: "pending",
        updatedAt: Date.now(),
      },
    });
  }

  async enqueueTask(task: WithID<Task>) {
    await this.queue.publish("task", `task.trigger.${task.type}.${task.id}`, {
      type: "task_trigger",
      id: uuid(),
      timestamp: Date.now(),
      task: {
        id: task.id,
        type: task.type,
        snapshot: task,
      },
    });
    await db.task.update(task.id, {
      status: { phase: "waiting", updatedAt: Date.now() },
    });
  }
}
