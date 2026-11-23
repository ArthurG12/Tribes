import test from "node:test";
import assert from "node:assert/strict";
import { registrationMessageForDelivery } from "../registration-message.mjs";

test("registration confirmation explains that daily quota placed the request in the queue", () => {
  const message = registrationMessageForDelivery({ status: "paused", reason: "daily_quota_exceeded" });
  assert.match(message, /limite diário de envio de emails/);
  assert.match(message, /entrou na fila/);
  assert.match(message, /cota for renovada/);
  assert.match(message, /24 horas/);
});

test("registration confirmation distinguishes monthly quota and completed delivery", () => {
  assert.match(
    registrationMessageForDelivery({ status: "paused", reason: "monthly_quota_exceeded" }),
    /cota mensal/
  );
  assert.match(registrationMessageForDelivery({ status: "sent" }), /válido por 24 horas/);
});

test("registration confirmation gives neutral copy while delivery status is unresolved", () => {
  assert.match(registrationMessageForDelivery({ status: "processing" }), /entrou na fila de envio/);
  assert.match(registrationMessageForDelivery(null), /Se este e-mail puder ser cadastrado/);
});
