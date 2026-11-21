import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NotFoundError, ValidationError } from "../../errors.js";
import { createUser, getUserById } from "./user.service.js";

describe("user.service", () => {
  it("creates a user and normalizes the email", async () => {
    const user = await createUser({ name: " Sara ", email: " Sara@Example.com " });

    assert.equal(user.name, "Sara");
    assert.equal(user.email, "sara@example.com");
    assert.deepEqual(await getUserById(user.id), user);
  });

  it("rejects a missing user with NotFoundError", async () => {
    await assert.rejects(getUserById(999), NotFoundError);
  });

  it("rejects an invalid email", async () => {
    await assert.rejects(createUser({ name: "Bad", email: "not-an-email" }), ValidationError);
  });

  it("rejects an empty name", async () => {
    await assert.rejects(createUser({ name: "  ", email: "x@example.com" }), ValidationError);
  });

  it("rejects a duplicate email", async () => {
    await assert.rejects(
      createUser({ name: "Copy", email: "MOHAMMED@example.com" }),
      ValidationError,
    );
  });
});
