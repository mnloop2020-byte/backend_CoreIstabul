import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NotFoundError, ValidationError } from "../../errors.js";
import { createTask, deleteTask, getTaskById, updateTask } from "./task.service.js";

describe("task.service", () => {
  // Success cases
  it("creates a task for an existing user", async () => {
    const task = await createTask({ title: "  Write tests  ", description: "", userId: 1 });

    assert.equal(task.title, "Write tests"); // trimmed
    assert.equal(task.completed, false);
    assert.equal(task.userId, 1);
  });

  it("updates only the fields that were sent", async () => {
    const task = await createTask({ title: "Original", description: "Keep me", userId: 1 });

    const updated = await updateTask(task.id, { completed: true });

    assert.equal(updated.completed, true);
    assert.equal(updated.title, "Original");
    assert.equal(updated.description, "Keep me");
  });

  it("returns copies, so changing a result does not change stored data", async () => {
    const task = await createTask({ title: "Safe", description: "", userId: 1 });

    task.title = "Changed outside";

    assert.equal((await getTaskById(task.id)).title, "Safe");
  });

  it("deletes a task", async () => {
    const task = await createTask({ title: "Temporary", description: "", userId: 1 });

    await deleteTask(task.id);

    await assert.rejects(getTaskById(task.id), NotFoundError);
  });

  // Failure cases
  it("rejects a missing task with NotFoundError", async () => {
    await assert.rejects(getTaskById(999), NotFoundError);
  });

  it("rejects a task for a missing user", async () => {
    await assert.rejects(
      createTask({ title: "No owner", description: "", userId: 999 }),
      NotFoundError,
    );
  });

  it("rejects an empty title", async () => {
    await assert.rejects(createTask({ title: "   ", description: "", userId: 1 }), ValidationError);
  });

  it("rejects updating a title to empty", async () => {
    const task = await createTask({ title: "Valid", description: "", userId: 1 });

    await assert.rejects(updateTask(task.id, { title: "" }), ValidationError);
  });
});
