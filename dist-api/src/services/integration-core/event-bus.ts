/**
 * Integration Event Bus — lightweight typed pub/sub for Integration Core.
 *
 * Usage:
 *   integrationEventBus.on("integration.status_changed", (e) => { ... });
 *   integrationEventBus.emit({ type: "integration.status_changed", ... });
 */

import { EventEmitter } from "node:events";
import type { IntegrationEvent, IntegrationEventType } from "./types.js";

class IntegrationEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit(event: IntegrationEvent): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit("*", event);
  }

  on(type: IntegrationEventType | "*", handler: (event: IntegrationEvent) => void): void {
    this.emitter.on(type, handler);
  }

  off(type: IntegrationEventType | "*", handler: (event: IntegrationEvent) => void): void {
    this.emitter.off(type, handler);
  }
}

export const integrationEventBus = new IntegrationEventBus();
