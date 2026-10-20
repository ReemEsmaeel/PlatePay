import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlate, plateForScenario } from "./plate";

test("the same plate resolves only within a visitor's private demo", () => {
  const plate = "12 34567";
  assert.equal(plateForScenario(plate), normalizePlate(plate));
  assert.notEqual(plateForScenario(plate, "visitor-a"), plateForScenario(plate, "visitor-b"));
  assert.notEqual(plateForScenario(plate, "visitor-a"), normalizePlate(plate));
  assert.notEqual(plateForScenario(plate, "visitor-a"), normalizePlate(plateForScenario(plate, "visitor-a")));
  assert.equal(plateForScenario("١٢٣٤٥٦٧", "visitor-a"), plateForScenario("1234567", "visitor-a"));
});

test("demo namespacing never makes an empty or too-short plate valid", () => {
  assert.equal(plateForScenario(" ", "visitor-a"), "");
  assert.equal(plateForScenario("1", "visitor-a"), "1");
});
