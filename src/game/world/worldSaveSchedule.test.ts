import { afterEach, describe, expect, it } from "vitest";
import {
  isHostPersistSuspended,
  resumeHostPersist,
  suspendHostPersist,
} from "./worldSaveSchedule";

describe("host persist suspend nesting", () => {
  afterEach(() => {
    while (isHostPersistSuspended()) {
      resumeHostPersist();
    }
  });

  it("stays suspended until every matching resume", () => {
    suspendHostPersist();
    suspendHostPersist();
    resumeHostPersist();
    expect(isHostPersistSuspended()).toBe(true);
    resumeHostPersist();
    expect(isHostPersistSuspended()).toBe(false);
  });
});
